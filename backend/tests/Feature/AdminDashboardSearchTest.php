<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Property;
use App\Models\SellerLead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_search_users_by_name_or_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['first_name' => 'Alice', 'last_name' => 'Smith', 'email' => 'alice@example.com']);
        User::factory()->create(['first_name' => 'Bob', 'last_name' => 'Jones', 'email' => 'bob@example.com']);

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?user_search=Alice');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'users.data');
        $response->assertJsonPath('users.data.0.full_name', 'Alice Smith');

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?user_search=bob@example.com');
        $response->assertJsonCount(1, 'users.data');
        $response->assertJsonPath('users.data.0.full_name', 'Bob Jones');
    }

    public function test_admin_can_search_agents_by_name_or_agency(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $user1 = User::factory()->create(['first_name' => 'Agent', 'last_name' => 'One', 'email' => 'agent1@example.com']);
        Agent::query()->create([
            'user_id' => $user1->id,
            'first_name' => 'Agent',
            'last_name' => 'One',
            'email' => 'agent1@example.com',
            'phone' => '12345678',
            'license_number' => 'RE-12345',
            'agency_name' => 'Luxury Realty',
            'approval_status' => 'approved',
        ]);

        $user2 = User::factory()->create(['first_name' => 'Agent', 'last_name' => 'Two', 'email' => 'agent2@example.com']);
        Agent::query()->create([
            'user_id' => $user2->id,
            'first_name' => 'Agent',
            'last_name' => 'Two',
            'email' => 'agent2@example.com',
            'phone' => '87654321',
            'license_number' => 'RE-67890',
            'agency_name' => 'Elite Homes',
            'approval_status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?agent_search=Luxury');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'agents.data');
        $response->assertJsonPath('agents.data.0.agency_name', 'Luxury Realty');

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?agent_search=Two');
        $response->assertJsonCount(1, 'agents.data');
        $response->assertJsonPath('agents.data.0.full_name', 'Agent Two');
    }

    public function test_admin_can_suspend_user_without_passing_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $response = $this->actingAs($admin)->patchJson("/api/admin/users/{$user->id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(200);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertEquals('user', $user->fresh()->role->value);
    }

    public function test_admin_cannot_be_suspended(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $targetAdmin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $response = $this->actingAs($admin)->patchJson("/api/admin/users/{$targetAdmin->id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'Administrator accounts cannot be suspended.');
        $this->assertTrue($targetAdmin->fresh()->is_active);
    }

    public function test_admin_can_permanently_delete_user_with_exact_confirmation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user', 'email' => 'spam@example.com']);

        $this->actingAs($admin)->deleteJson("/api/admin/users/{$user->id}", [
            'confirmation' => 'DELETE wrong@example.com',
        ])->assertStatus(422);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$user->id}", [
            'confirmation' => 'DELETE spam@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'User permanently deleted.');

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    public function test_admin_accounts_cannot_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $targetAdmin = User::factory()->create(['role' => 'admin', 'email' => 'owner@example.com']);

        $response = $this->actingAs($admin)->deleteJson("/api/admin/users/{$targetAdmin->id}", [
            'confirmation' => 'DELETE owner@example.com',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Administrator accounts cannot be deleted.');

        $this->assertDatabaseHas('users', [
            'id' => $targetAdmin->id,
        ]);
    }

    public function test_admin_can_search_properties_by_title_or_location(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $agent = User::factory()->create(['role' => 'agent']);
        $agentProfile = Agent::query()->create([
            'user_id' => $agent->id,
            'first_name' => 'Agent',
            'last_name' => 'One',
            'email' => $agent->email,
            'phone' => '1234',
            'license_number' => 'L1',
            'approval_status' => 'approved',
        ]);

        Property::query()->create([
            'agent_id' => $agentProfile->agent_id,
            'title' => 'Modern Villa',
            'slug' => 'modern-villa',
            'description' => 'A modern villa',
            'property_type' => 'House',
            'price' => 1000000,
            'address_line' => '123 Street',
            'city' => 'Manila',
            'province' => 'Metro Manila',
            'status' => 'Available',
        ]);

        Property::query()->create([
            'agent_id' => $agentProfile->agent_id,
            'title' => 'Beach Condo',
            'slug' => 'beach-condo',
            'description' => 'A beach condo',
            'property_type' => 'Condo',
            'price' => 500000,
            'address_line' => '456 Coast',
            'city' => 'Cebu',
            'province' => 'Cebu',
            'status' => 'Available',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?property_search=Villa');
        $response->assertJsonCount(1, 'properties.data');
        $response->assertJsonPath('properties.data.0.title', 'Modern Villa');

        $response = $this->actingAs($admin)->getJson('/api/admin/overview?property_search=Cebu');
        $response->assertJsonCount(1, 'properties.data');
        $response->assertJsonPath('properties.data.0.title', 'Beach Condo');
    }

    public function test_admin_can_view_assign_and_track_seller_leads(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $agent = Agent::factory()->create(['approval_status' => 'approved']);
        $lead = SellerLead::query()->create([
            'full_name' => 'Lara Santos',
            'email' => 'lara@example.com',
            'phone' => '09171234567',
            'property_type' => 'House',
            'property_address' => '18 Mango Street, Makati, Metro Manila',
            'bedrooms' => 3,
            'bathrooms' => 2,
            'condition_of_home' => 'Good - well maintained, minor cosmetic needs',
            'expected_price' => 7200000,
            'status' => 'New',
        ]);

        $overview = $this->actingAs($admin)->getJson('/api/admin/overview');

        $overview->assertOk()
            ->assertJsonPath('seller_leads.data.0.full_name', 'Lara Santos')
            ->assertJsonPath('seller_leads.data.0.property_address', '18 Mango Street, Makati, Metro Manila')
            ->assertJsonPath('seller_leads.data.0.status', 'New')
            ->assertJsonPath('assignable_agents.0.agent_id', $agent->agent_id);

        $response = $this->actingAs($admin)->patchJson("/api/admin/seller-leads/{$lead->seller_lead_id}", [
            'status' => 'Contacted',
            'assigned_agent_id' => $agent->agent_id,
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Seller lead updated.')
            ->assertJsonPath('data.status', 'Contacted')
            ->assertJsonPath('data.assigned_agent.agent_id', $agent->agent_id);

        $this->assertDatabaseHas('seller_leads', [
            'seller_lead_id' => $lead->seller_lead_id,
            'status' => 'Contacted',
            'assigned_agent_id' => $agent->agent_id,
        ]);
    }
}
