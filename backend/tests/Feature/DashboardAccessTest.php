<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_admin_can_open_the_dashboard_and_admin_overview(): void
    {
        $admin = User::factory()->unverified()->create([
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

    public function test_unverified_pending_agent_can_open_the_dashboard_but_not_manage_approved_agent_tools(): void
    {
        $agentUser = User::factory()->unverified()->create([
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
            ->assertForbidden();

        $this->actingAs($agentUser->fresh('agentProfile'), 'web')
            ->getJson('/api/agent/properties')
            ->assertForbidden();
    }

    public function test_unverified_buyer_still_cannot_open_verified_only_user_routes(): void
    {
        $buyer = User::factory()->unverified()->create([
            'role' => UserRole::USER,
        ]);

        $this->actingAs($buyer, 'web')
            ->getJson('/api/saved-properties')
            ->assertForbidden();
    }
}
