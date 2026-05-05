<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ViewingRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_submit_viewing_request(): void
    {
        $user = \App\Models\User::factory()->create(['role' => 'user']);
        $agentUser = \App\Models\User::factory()->create(['role' => 'agent']);
        $agent = \App\Models\Agent::factory()->create(['user_id' => $agentUser->id]);
        $property = \App\Models\Property::factory()->create(['agent_id' => $agent->agent_id]);

        $response = $this->actingAs($user)->postJson("/api/properties/{$property->property_id}/viewing-requests", [
            'requested_date' => now()->addDays(2)->format('Y-m-d'),
            'requested_time' => '14:00',
            'buyer_message' => 'I would like to see the property.'
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('message', 'Viewing request submitted successfully.');

        $this->assertDatabaseHas('viewing_requests', [
            'buyer_id' => $user->id,
            'property_id' => $property->property_id,
            'status' => 'Pending',
        ]);
    }

    public function test_agent_can_update_viewing_request_status(): void
    {
        $user = \App\Models\User::factory()->create(['role' => 'user']);
        $agentUser = \App\Models\User::factory()->create(['role' => 'agent']);
        $agent = \App\Models\Agent::factory()->create(['user_id' => $agentUser->id]);
        $property = \App\Models\Property::factory()->create(['agent_id' => $agent->agent_id]);

        $viewingRequest = \App\Models\ViewingRequest::create([
            'buyer_id' => $user->id,
            'agent_id' => $agentUser->id,
            'property_id' => $property->property_id,
            'requested_date' => now()->addDays(2)->format('Y-m-d'),
            'requested_time' => '14:00',
            'status' => 'Pending',
        ]);

        $response = $this->actingAs($agentUser)->patchJson("/api/agent/viewing-requests/{$viewingRequest->viewing_request_id}", [
            'status' => 'Confirmed',
            'confirmed_date' => now()->addDays(2)->format('Y-m-d'),
            'confirmed_time' => '14:00',
            'agent_notes' => 'Looking forward to meeting you.'
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('viewing_requests', [
            'viewing_request_id' => $viewingRequest->viewing_request_id,
            'status' => 'Confirmed',
            'agent_notes' => 'Looking forward to meeting you.',
        ]);
    }
}
