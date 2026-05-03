<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
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
