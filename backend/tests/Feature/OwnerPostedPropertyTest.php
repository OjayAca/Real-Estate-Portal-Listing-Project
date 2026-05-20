<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerPostedPropertyTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_submit_owner_listing_for_review_and_admin_approval_makes_it_public(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create([
            'first_name' => 'Lara',
            'last_name' => 'Santos',
            'email' => 'lara.owner@example.com',
            'phone' => '09171234567',
            'phone_verified_at' => now(),
            'phone_verified_phone' => '09171234567',
            'role' => UserRole::USER,
        ]);
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/owner/properties', [
            'title' => 'Owner Posted Home',
            'description' => 'A direct owner listing submitted for administrator review.',
            'property_type' => 'House',
            'listing_purpose' => 'sale',
            'price' => 7200000,
            'address_line' => '18 Mango Street',
            'city' => 'Makati',
            'province' => 'Metro Manila',
            'status' => 'Pending Review',
            'owner_proof_type' => 'tax_declaration',
            'owner_proof_upload' => UploadedFile::fake()->create('tax-declaration.pdf', 256, 'application/pdf'),
            'legal_accuracy_certified' => '1',
            'legal_no_duplicate' => '1',
            'legal_data_privacy_consent' => '1',
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.owner.full_name', 'Lara Santos')
            ->assertJsonPath('data.agent', null)
            ->assertJsonPath('data.contact_type', 'owner')
            ->assertJsonPath('data.status', 'Pending Review');

        $property = Property::query()->firstOrFail();

        $this->assertDatabaseHas('properties', [
            'property_id' => $property->property_id,
            'owner_id' => $owner->id,
            'agent_id' => null,
            'status' => 'Pending Review',
        ]);

        $this->getJson('/api/properties')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/properties/{$property->property_id}/verification", [
            'owner_proof_status' => 'verified',
        ])->assertOk();

        $this->patchJson("/api/admin/properties/{$property->property_id}", [
            'status' => 'Available',
            'status_reason' => 'Owner listing approved.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Available');

        $this->getJson("/api/properties/{$property->property_id}")
            ->assertOk()
            ->assertJsonPath('data.owner.full_name', 'Lara Santos')
            ->assertJsonPath('data.owner.email', 'lara.owner@example.com')
            ->assertJsonPath('data.owner.phone', '09171234567')
            ->assertJsonPath('data.agent', null)
            ->assertJsonPath('data.contact_type', 'owner');
    }

    public function test_buyer_can_inquire_and_request_viewing_for_owner_listing_and_owner_can_manage_them(): void
    {
        Mail::fake();

        $owner = User::factory()->create(['role' => UserRole::USER]);
        $buyer = User::factory()->create(['role' => UserRole::USER]);
        $property = Property::factory()->create([
            'agent_id' => null,
            'owner_id' => $owner->id,
            'status' => 'Available',
            'listed_at' => now(),
        ]);

        Sanctum::actingAs($buyer);

        $this->postJson("/api/properties/{$property->property_id}/inquiries", [
            'message' => 'I am interested in this owner-posted property.',
        ])->assertCreated()
            ->assertJsonPath('message', 'Inquiry sent successfully to the owner via email.');

        $this->postJson("/api/properties/{$property->property_id}/viewing-requests", [
            'requested_date' => now()->addDay()->toDateString(),
            'requested_time' => '10:30',
            'buyer_message' => 'I would like to see the property this week.',
        ])->assertCreated();

        $this->assertDatabaseHas('inquiries', [
            'owner_id' => $owner->id,
            'agent_id' => null,
            'property_id' => $property->property_id,
            'buyer_id' => $buyer->id,
        ]);

        $this->assertDatabaseHas('viewing_requests', [
            'owner_id' => $owner->id,
            'agent_id' => null,
            'property_id' => $property->property_id,
            'buyer_id' => $buyer->id,
            'status' => 'Pending',
        ]);

        Sanctum::actingAs($owner);

        $inquiryId = $this->getJson('/api/owner/inquiries')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.0.inquiry_id');

        $this->patchJson("/api/owner/inquiries/{$inquiryId}", [
            'status' => 'Contacted',
        ])->assertOk()
            ->assertJsonPath('inquiry.status', 'Contacted');

        $viewingRequestId = $this->getJson('/api/owner/viewing-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.0.viewing_request_id');

        $this->patchJson("/api/owner/viewing-requests/{$viewingRequestId}", [
            'status' => 'Confirmed',
            'confirmed_date' => now()->addDay()->toDateString(),
            'confirmed_time' => '10:30',
            'agent_notes' => 'Confirmed by owner.',
        ])->assertOk()
            ->assertJsonPath('viewing_request.status', 'Confirmed');
    }
}
