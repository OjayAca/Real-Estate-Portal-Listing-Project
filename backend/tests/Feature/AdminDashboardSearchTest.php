<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Property;
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
}
