<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\VerifyEmailChangeMail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'password' => 'old-password',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/auth/password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_user_cannot_change_password_with_wrong_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'old-password',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/auth/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertStatus(422);

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_user_can_request_email_change(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)
            ->patchJson('/api/auth/email', [
                'email' => 'new@example.com',
            ])
            ->assertOk();

        Mail::assertSent(VerifyEmailChangeMail::class, function ($mail) use ($user) {
            return $mail->hasTo('new@example.com') &&
                   $mail->user->id === $user->id &&
                   $mail->newEmail === 'new@example.com';
        });
    }

    public function test_user_can_verify_email_change(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $newEmail = 'new@example.com';

        $verificationUrl = URL::temporarySignedRoute(
            'auth.email.verify',
            now()->addMinutes(60),
            ['user' => $user->id, 'email' => $newEmail]
        );

        $this->get($verificationUrl)
            ->assertRedirect(config('app.frontend_url').'/account/settings?verified=1');

        $this->assertEquals($newEmail, $user->fresh()->email);
    }

    public function test_user_can_update_profile(): void
    {
        $user = User::factory()->create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '1234567890',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'phone' => '0987654321',
            ])
            ->assertOk()
            ->assertJsonPath('user.first_name', 'Jane')
            ->assertJsonPath('user.last_name', 'Smith')
            ->assertJsonPath('user.phone', '0987654321');

        $this->assertEquals('Jane', $user->fresh()->first_name);
        $this->assertEquals('Smith', $user->fresh()->last_name);
        $this->assertEquals('0987654321', $user->fresh()->phone);
    }

    public function test_agent_profile_syncs_on_update(): void
    {
        $user = User::factory()->create(['role' => 'agent']);
        $agent = \App\Models\Agent::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '1234567890',
        ]);

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'phone' => '0987654321',
            ])
            ->assertOk();

        $agent->refresh();
        $this->assertEquals('Jane', $agent->first_name);
        $this->assertEquals('Smith', $agent->last_name);
        $this->assertEquals('0987654321', $agent->phone);
    }
}
