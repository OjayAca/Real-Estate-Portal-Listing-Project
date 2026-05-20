<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_me_endpoint_allows_normal_session_checks(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/auth/me')->assertStatus(200);
        }

        $this->getJson('/api/auth/me')->assertStatus(429);
    }

    public function test_login_endpoint_keeps_strict_auth_rate_limit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'missing@example.com',
                'password' => 'password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'missing@example.com',
            'password' => 'password',
        ])->assertStatus(429);
    }
}
