<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use App\Notifications\PropertyStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyStatusApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_cannot_create_listing_already_pending_final_status(): void
    {
        [$agentUser] = $this->createApprovedAgent();
        Sanctum::actingAs($agentUser);

        $response = $this->postJson('/api/agent/properties', [
            'title' => 'Premature Pending Listing',
            'description' => 'A new listing should start as draft or available only.',
            'property_type' => 'House',
            'price' => 4500000,
            'address_line' => '123 Review Street',
            'city' => 'Makati',
            'province' => 'Metro Manila',
            'status' => 'Pending Sold',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['status']);
        $this->assertDatabaseCount('properties', 0);
        $this->assertDatabaseCount('property_status_logs', 0);
    }

    public function test_agent_cannot_mark_own_listing_sold_or_rented_directly(): void
    {
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'status' => 'Available',
        ]);

        Sanctum::actingAs($agentUser);

        foreach (['Sold', 'Rented'] as $status) {
            $this->putJson("/api/agent/properties/{$property->property_id}", [
                'status' => $status,
            ])->assertUnprocessable()->assertJsonValidationErrors(['status']);
        }

        $this->assertSame('Available', $property->fresh()->status);
        $this->assertDatabaseCount('property_status_logs', 0);
    }

    public function test_agent_pending_status_request_is_logged_and_visible_to_admins(): void
    {
        Notification::fake();

        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'status' => 'Available',
        ]);

        Sanctum::actingAs($agentUser);

        $this->putJson("/api/agent/properties/{$property->property_id}", [
            'status' => 'Pending Sold',
            'status_reason' => 'Buyer signed the contract and deposit has been collected.',
        ])->assertOk()->assertJsonPath('data.status', 'Pending Sold');

        $this->assertDatabaseHas('property_status_logs', [
            'property_id' => $property->property_id,
            'user_id' => $agentUser->id,
            'old_status' => 'Available',
            'new_status' => 'Pending Sold',
            'reason' => 'Buyer signed the contract and deposit has been collected.',
        ]);

        Notification::assertSentTo($admin, PropertyStatusNotification::class);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/overview')
            ->assertOk()
            ->assertJsonPath('stats.pending_approvals', 1)
            ->assertJsonPath('pending_property_approvals.0.property_id', $property->property_id)
            ->assertJsonPath('pending_property_approvals.0.status', 'Pending Sold')
            ->assertJsonPath('pending_property_approvals.0.status_logs.0.reason', 'Buyer signed the contract and deposit has been collected.')
            ->assertJsonPath('pending_property_approvals.0.status_logs.0.user_name', $agentUser->full_name);
    }

    public function test_admin_can_approve_pending_sold_status_with_audit_log(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'status' => 'Pending Sold',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/properties/{$property->property_id}", [
            'status' => 'Sold',
            'status_reason' => 'Admin verified closing documents.',
        ])->assertOk()->assertJsonPath('data.status', 'Sold');

        $this->assertSame('Sold', $property->fresh()->status);
        $this->assertDatabaseHas('property_status_logs', [
            'property_id' => $property->property_id,
            'user_id' => $admin->id,
            'old_status' => 'Pending Sold',
            'new_status' => 'Sold',
            'reason' => 'Admin verified closing documents.',
        ]);
        $this->assertDatabaseMissing('property_status_logs', [
            'property_id' => $property->property_id,
            'user_id' => $agentUser->id,
            'new_status' => 'Sold',
        ]);
    }

    /**
     * @return array{0: User, 1: Agent}
     */
    private function createApprovedAgent(): array
    {
        $user = User::factory()->create([
            'role' => UserRole::AGENT,
        ]);

        $agent = Agent::factory()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'approval_status' => 'approved',
        ]);

        return [$user, $agent];
    }
}
