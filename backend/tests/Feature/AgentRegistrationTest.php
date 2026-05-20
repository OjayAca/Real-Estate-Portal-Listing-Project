<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\User;
use App\Support\ImageUrlResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AgentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_registration_accepts_demo_credentials_and_profile_picture(): void
    {
        Storage::fake();

        $response = $this->post('/api/auth/register', [
            'first_name' => 'Maya',
            'last_name' => 'Reyes',
            'email' => 'maya@example.com',
            'phone' => '+63 917 123 4567',
            'role' => UserRole::AGENT->value,
            'license_number' => '12345',
            'dhsud_registration_number' => 'DHSUD-DEMO-001',
            'password' => 'password',
            'password_confirmation' => 'password',
            'profile_picture_upload' => UploadedFile::fake()->image('profile.png', 640, 640),
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('user.role', UserRole::AGENT->value)
            ->assertJsonPath('user.agent_profile.license_number', '12345')
            ->assertJsonPath('user.agent_profile.dhsud_registration_number', 'DHSUD-DEMO-001');

        $agent = Agent::query()->firstOrFail();

        $this->assertSame('pending', $agent->approval_status);
        $this->assertNotNull($agent->profile_picture);
        Storage::assertExists($agent->profile_picture);
        $response->assertJsonPath('user.agent_profile.profile_picture', ImageUrlResolver::resolve($agent->profile_picture));
    }

    public function test_duplicate_demo_prc_numbers_are_allowed_for_agents(): void
    {
        User::factory()->create([
            'role' => UserRole::AGENT,
            'email' => 'first@example.com',
        ])->agent()->create([
            'first_name' => 'First',
            'last_name' => 'Agent',
            'email' => 'first@example.com',
            'phone' => '+63 900 000 0001',
            'license_number' => '12345',
            'approval_status' => 'pending',
        ]);

        $this->post('/api/auth/register', [
            'first_name' => 'Second',
            'last_name' => 'Agent',
            'email' => 'second@example.com',
            'phone' => '+63 900 000 0002',
            'role' => UserRole::AGENT->value,
            'license_number' => '12345',
            'password' => 'password',
            'password_confirmation' => 'password',
        ], ['Accept' => 'application/json'])->assertCreated()
            ->assertJsonPath('user.agent_profile.license_number', '12345');

        $this->assertSame(2, Agent::query()->where('license_number', '12345')->count());
    }

    public function test_agent_profile_picture_must_be_jpg_or_png(): void
    {
        $this->post('/api/auth/register', [
            'first_name' => 'Invalid',
            'last_name' => 'Upload',
            'email' => 'invalid-upload@example.com',
            'phone' => '+63 917 123 4567',
            'role' => UserRole::AGENT->value,
            'license_number' => '54321',
            'password' => 'password',
            'password_confirmation' => 'password',
            'profile_picture_upload' => UploadedFile::fake()->create('profile.pdf', 16, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_picture_upload']);
    }

    public function test_agent_credentials_and_profile_picture_are_returned_from_me_and_dashboard(): void
    {
        Storage::fake();

        $user = User::factory()->create([
            'role' => UserRole::AGENT,
            'email' => 'dashboard-agent@example.com',
        ]);

        $agent = Agent::factory()->create([
            'user_id' => $user->id,
            'email' => $user->email,
            'license_number' => '67890',
            'dhsud_registration_number' => 'DHSUD-RETURN-001',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 480, 480)->store('agents/agent-demo/profile', ['visibility' => 'public']),
            'approval_status' => 'pending',
        ]);

        $expectedUrl = ImageUrlResolver::resolve($agent->profile_picture);

        $this->actingAs($user, 'web')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.agent_profile.dhsud_registration_number', 'DHSUD-RETURN-001')
            ->assertJsonPath('user.agent_profile.profile_picture', $expectedUrl);

        $this->actingAs($user, 'web')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('profile.dhsud_registration_number', 'DHSUD-RETURN-001')
            ->assertJsonPath('profile.profile_picture', $expectedUrl);
    }
}
