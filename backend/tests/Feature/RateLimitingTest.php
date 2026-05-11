<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_me_endpoint_is_rate_limited(): void
    {
        // Hit the endpoint 5 times (the limit)
        for ($i = 0; $i < 5; $i++) {
            $this->getJson('/api/auth/me')->assertStatus(200);
        }

        // The 6th attempt should be throttled (429 Too Many Requests)
        $this->getJson('/api/auth/me')->assertStatus(429);
    }
}
