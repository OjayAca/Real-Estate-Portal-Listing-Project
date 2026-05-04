<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\SellerLead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_the_dashboard_and_admin_overview(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $this->actingAs($admin, 'web')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('role', UserRole::ADMIN->value);

        $this->actingAs($admin, 'web')
            ->getJson('/api/admin/overview')
            ->assertOk();
    }

    public function test_pending_agent_can_open_limited_dashboard_but_cannot_manage_properties(): void
    {
        $agentUser = User::factory()->create([
            'role' => UserRole::AGENT,
        ]);

        Agent::query()->create([
            'user_id' => $agentUser->id,
            'first_name' => $agentUser->first_name,
            'last_name' => $agentUser->last_name,
            'email' => $agentUser->email,
            'phone' => $agentUser->phone,
            'license_number' => 'LIC-1001',
            'approval_status' => 'pending',
        ]);

        $this->actingAs($agentUser->fresh('agentProfile'), 'web')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('profile.approval_status', 'pending');

        $this->actingAs($agentUser->fresh('agentProfile'), 'web')
            ->getJson('/api/agent/properties')
            ->assertForbidden();
    }

    public function test_buyer_cannot_open_dashboard_content(): void
    {
        $buyer = User::factory()->create([
            'role' => UserRole::USER,
        ]);

        $this->actingAs($buyer, 'web')
            ->getJson('/api/dashboard')
            ->assertForbidden();
    }

    public function test_approved_agent_dashboard_returns_only_assigned_seller_leads(): void
    {
        $agentUser = User::factory()->create(['role' => UserRole::AGENT]);
        $otherAgentUser = User::factory()->create(['role' => UserRole::AGENT]);
        $agent = Agent::factory()->create([
            'user_id' => $agentUser->id,
            'approval_status' => 'approved',
        ]);
        $otherAgent = Agent::factory()->create([
            'user_id' => $otherAgentUser->id,
            'approval_status' => 'approved',
        ]);

        $assignedLead = SellerLead::query()->create([
            'full_name' => 'Assigned Seller',
            'email' => 'assigned@example.com',
            'phone' => '09171234567',
            'property_type' => 'House',
            'property_address' => '12 Maple Avenue, Quezon City',
            'bedrooms' => 3,
            'bathrooms' => 2,
            'condition_of_home' => 'Good',
            'expected_price' => 5500000,
            'status' => 'New',
            'assigned_agent_id' => $agent->agent_id,
        ]);

        SellerLead::query()->create([
            'full_name' => 'Other Seller',
            'email' => 'other@example.com',
            'phone' => '09170000000',
            'property_type' => 'Condo',
            'property_address' => '34 Oak Tower, Makati',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'status' => 'New',
            'assigned_agent_id' => $otherAgent->agent_id,
        ]);

        SellerLead::query()->create([
            'full_name' => 'Unassigned Seller',
            'email' => 'unassigned@example.com',
            'phone' => '09171111111',
            'property_type' => 'Lot',
            'property_address' => '56 Pine Road, Taguig',
            'bedrooms' => 0,
            'bathrooms' => 0,
            'status' => 'New',
        ]);

        $this->actingAs($agentUser, 'web')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.seller_leads', 1)
            ->assertJsonPath('stats.new_seller_leads', 1)
            ->assertJsonCount(1, 'assigned_seller_leads')
            ->assertJsonPath('assigned_seller_leads.0.seller_lead_id', $assignedLead->seller_lead_id)
            ->assertJsonPath('assigned_seller_leads.0.full_name', 'Assigned Seller')
            ->assertJsonPath('assigned_seller_leads.0.property_address', '12 Maple Avenue, Quezon City');
    }

    public function test_buyer_can_open_saved_properties(): void
    {
        $buyer = User::factory()->create([
            'role' => UserRole::USER,
        ]);
        $property = Property::factory()->create(['status' => 'Available']);
        $buyer->savedProperties()->attach($property->property_id);

        $this->actingAs($buyer, 'web')
            ->getJson('/api/saved-properties')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_profile_update_validates_and_persists_supported_fields(): void
    {
        $buyer = User::factory()->create([
            'first_name' => 'Old',
            'last_name' => 'Name',
            'phone' => '111',
            'role' => UserRole::USER,
        ]);

        $this->actingAs($buyer, 'web')
            ->patchJson('/api/auth/profile', [
                'first_name' => '',
                'last_name' => 'Updated',
                'phone' => '222',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name']);

        $this->actingAs($buyer, 'web')
            ->patchJson('/api/auth/profile', [
                'first_name' => 'New',
                'last_name' => 'Buyer',
                'phone' => '+1 555 123 4567',
            ])
            ->assertOk()
            ->assertJsonPath('user.first_name', 'New')
            ->assertJsonPath('user.last_name', 'Buyer')
            ->assertJsonPath('user.phone', '+1 555 123 4567');

        $this->assertDatabaseHas('users', [
            'id' => $buyer->id,
            'first_name' => 'New',
            'last_name' => 'Buyer',
            'phone' => '+1 555 123 4567',
        ]);
    }
}
