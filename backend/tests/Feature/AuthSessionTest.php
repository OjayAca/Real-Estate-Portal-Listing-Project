<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_uses_a_frontend_session_cookie_for_authenticated_requests(): void
    {
        $user = User::factory()->create();
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->withHeader('Origin', config('app.frontend_url'))
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent();

        $login = $this->withHeader('Origin', config('app.frontend_url'))
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ]);

        $login->assertOk()->assertJsonPath('user.id', $user->id);

        $this->withHeader('Origin', config('app.frontend_url'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_logout_clears_the_session_and_returns_an_empty_auth_state(): void
    {
        $user = User::factory()->create();
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->withHeader('Origin', config('app.frontend_url'))
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent();

        $this->withHeader('Origin', config('app.frontend_url'))
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();

        $this->withHeader('Origin', config('app.frontend_url'))
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->withHeader('Origin', config('app.frontend_url'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user', null);
    }
}
