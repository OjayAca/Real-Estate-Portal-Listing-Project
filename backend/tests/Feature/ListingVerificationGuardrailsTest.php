<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListingVerificationGuardrailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_save_draft_without_verification_documents(): void
    {
        $owner = User::factory()->create(['role' => UserRole::USER]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/owner/properties', $this->propertyPayload(['status' => 'Draft']))
            ->assertCreated()
            ->assertJsonPath('data.status', 'Draft');

        $this->assertDatabaseHas('properties', [
            'owner_id' => $owner->id,
            'status' => 'Draft',
        ]);
        $this->assertDatabaseCount('property_verifications', 0);
    }

    public function test_owner_submission_requires_terms_phone_otp_and_proof(): void
    {
        $owner = User::factory()->create(['role' => UserRole::USER, 'phone' => '09171234567']);
        Sanctum::actingAs($owner);

        $this->postJson('/api/owner/properties', $this->propertyPayload(['status' => 'Pending Review']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'legal_accuracy_certified',
                'legal_no_duplicate',
                'legal_data_privacy_consent',
                'mobile_phone',
                'owner_proof_type',
                'owner_proof_upload',
            ]);
    }

    public function test_demo_mobile_otp_verifies_user_phone(): void
    {
        $owner = User::factory()->create(['role' => UserRole::USER, 'phone' => '09171234567']);
        Sanctum::actingAs($owner);

        $code = $this->postJson('/api/auth/mobile-otp/request')
            ->assertOk()
            ->assertJsonStructure(['demo_code', 'expires_at'])
            ->json('demo_code');

        $this->postJson('/api/auth/mobile-otp/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('message', 'Mobile number verified.');

        $owner->refresh();
        $this->assertNotNull($owner->phone_verified_at);
        $this->assertSame('09171234567', $owner->phone_verified_phone);
    }

    public function test_owner_submission_stores_private_proof_and_admin_must_verify_before_approval(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create([
            'role' => UserRole::USER,
            'phone' => '09171234567',
            'phone_verified_at' => now(),
            'phone_verified_phone' => '09171234567',
        ]);
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        Sanctum::actingAs($owner);

        $response = $this->post('/api/owner/properties', $this->propertyPayload([
            'status' => 'Pending Review',
            'owner_proof_type' => 'tax_declaration',
            'owner_proof_upload' => UploadedFile::fake()->create('tax-declaration.pdf', 256, 'application/pdf'),
            'legal_accuracy_certified' => '1',
            'legal_no_duplicate' => '1',
            'legal_data_privacy_consent' => '1',
        ]), ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonMissingPath('data.verification.owner_proof_path')
            ->assertJsonPath('data.verification.owner_proof_uploaded', true)
            ->assertJsonPath('data.verification.owner_proof_status', 'pending');

        $property = Property::query()->with('verification')->firstOrFail();
        Storage::disk('local')->assertExists($property->verification->owner_proof_path);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/properties/{$property->property_id}", [
            'status' => 'Available',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['verification']);

        $this->patchJson("/api/admin/properties/{$property->property_id}/verification", [
            'owner_proof_status' => 'verified',
        ])->assertOk()
            ->assertJsonPath('data.owner_proof_status', 'verified');

        $this->patchJson("/api/admin/properties/{$property->property_id}", [
            'status' => 'Available',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Available');
    }

    public function test_agent_submission_requires_ats_prc_and_terms(): void
    {
        [$agentUser] = $this->createApprovedAgent();
        Sanctum::actingAs($agentUser);

        $this->postJson('/api/agent/properties', $this->propertyPayload(['status' => 'Pending Review']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'authority_to_sell_confirmed',
                'prc_license_expires_at',
                'legal_accuracy_certified',
            ]);
    }

    public function test_agent_submission_rejects_expired_prc_license(): void
    {
        [$agentUser] = $this->createApprovedAgent();
        Sanctum::actingAs($agentUser);

        $this->postJson('/api/agent/properties', $this->propertyPayload([
            'status' => 'Pending Review',
            'authority_to_sell_confirmed' => true,
            'prc_license_number' => 'PRC-12345',
            'prc_license_expires_at' => now()->subDay()->toDateString(),
            'legal_accuracy_certified' => true,
            'legal_no_duplicate' => true,
            'legal_data_privacy_consent' => true,
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['prc_license_expires_at']);
    }

    public function test_admin_cannot_approve_agent_listing_until_prc_is_verified(): void
    {
        [$agentUser] = $this->createApprovedAgent();
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        Sanctum::actingAs($agentUser);

        $propertyId = $this->postJson('/api/agent/properties', $this->propertyPayload([
            'status' => 'Pending Review',
            'authority_to_sell_confirmed' => true,
            'prc_license_number' => 'PRC-12345',
            'prc_license_expires_at' => now()->addYear()->toDateString(),
            'legal_accuracy_certified' => true,
            'legal_no_duplicate' => true,
            'legal_data_privacy_consent' => true,
        ]))->assertCreated()
            ->json('data.property_id');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/properties/{$propertyId}", ['status' => 'Available'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['verification']);

        $this->patchJson("/api/admin/properties/{$propertyId}/verification", [
            'prc_verification_status' => 'verified',
        ])->assertOk();

        $this->patchJson("/api/admin/properties/{$propertyId}", ['status' => 'Available'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Available');
    }

    public function test_duplicate_pending_listing_is_blocked_for_same_submitter(): void
    {
        [$agentUser, $agent] = $this->createApprovedAgent();
        Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'address_line' => '18 Mango Street',
            'city' => 'Makati',
            'province' => 'Metro Manila',
            'property_type' => 'House',
            'listing_purpose' => 'sale',
            'status' => 'Pending Review',
        ]);

        Sanctum::actingAs($agentUser);

        $this->postJson('/api/agent/properties', $this->propertyPayload([
            'status' => 'Pending Review',
            'authority_to_sell_confirmed' => true,
            'prc_license_number' => 'PRC-12345',
            'prc_license_expires_at' => now()->addYear()->toDateString(),
            'legal_accuracy_certified' => true,
            'legal_no_duplicate' => true,
            'legal_data_privacy_consent' => true,
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['address_line']);
    }

    private function propertyPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Verified Guardrail Home',
            'description' => 'A listing used to test verification guardrails.',
            'property_type' => 'House',
            'listing_purpose' => 'sale',
            'price' => 7200000,
            'address_line' => '18 Mango Street',
            'city' => 'Makati',
            'province' => 'Metro Manila',
        ], $overrides);
    }

    private function createApprovedAgent(): array
    {
        $user = User::factory()->create([
            'role' => UserRole::AGENT,
            'email' => 'agent-'.fake()->unique()->numberBetween(1000, 9999).'@example.com',
        ]);

        $agent = Agent::factory()->create([
            'user_id' => $user->id,
            'email' => $user->email,
            'approval_status' => 'approved',
        ]);

        return [$user, $agent];
    }
}
