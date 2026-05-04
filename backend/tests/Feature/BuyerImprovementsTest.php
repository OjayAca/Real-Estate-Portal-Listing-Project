<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\BuyerAgentInteraction;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuyerImprovementsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that saved properties are paginated.
     */
    public function test_saved_properties_are_paginated(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $properties = Property::factory()->count(15)->create();

        $user->savedProperties()->attach($properties->pluck('property_id'));

        $response = $this->actingAs($user)->getJson('/api/saved-properties');

        $response->assertStatus(200)
            ->assertJsonCount(12, 'data')
            ->assertJsonStructure([
                'data',
                'meta',
            ]);
    }

    /**
     * Test that users can only review agents they have interacted with.
     */
    public function test_agent_reviews_are_restricted_to_interacted_users(): void
    {
        $buyer = User::factory()->create(['role' => 'user']);
        $agent = Agent::factory()->create(['approval_status' => 'approved']);

        // Case 1: No interaction
        $response = $this->actingAs($buyer)->postJson("/api/agents/{$agent->agent_id}/reviews", [
            'rating' => 5,
            'comment' => 'Great agent!',
        ]);

        $response->assertStatus(403)
            ->assertJsonFragment(['message' => "You can only review agents you've previously contacted or requested a viewing with."]);

        // Case 2: After interaction (inquiry)
        BuyerAgentInteraction::create([
            'user_id' => $buyer->id,
            'agent_id' => $agent->agent_id,
            'interaction_type' => 'inquiry',
        ]);

        $response = $this->actingAs($buyer)->postJson("/api/agents/{$agent->agent_id}/reviews", [
            'rating' => 5,
            'comment' => 'Great agent!',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('agent_reviews', [
            'user_id' => $buyer->id,
            'agent_id' => $agent->agent_id,
            'rating' => 5,
        ]);
    }

    /**
     * Test Saved Searches CRUD.
     */
    public function test_saved_searches_crud(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        // Create
        $response = $this->actingAs($user)->postJson('/api/saved-searches', [
            'name' => 'Dream Homes',
            'listing_purpose' => 'sale',
            'filters' => [
                'city' => 'New York',
                'min_price' => 500000,
            ],
            'notify_email' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Dream Homes');

        $searchId = $response->json('data.id');

        // List
        $this->actingAs($user)->getJson('/api/saved-searches')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Update
        $this->actingAs($user)->patchJson("/api/saved-searches/{$searchId}", [
            'name' => 'Updated Name',
            'notify_email' => false,
        ])->assertStatus(200)
          ->assertJsonPath('data.name', 'Updated Name')
          ->assertJsonPath('data.notify_email', false);

        // Delete
        $this->actingAs($user)->deleteJson("/api/saved-searches/{$searchId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('saved_searches', ['id' => $searchId]);
    }

    /**
     * Test toggling saved search alerts.
     */
    public function test_saved_search_toggle_alert(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $otherUser = User::factory()->create(['role' => 'user']);

        $search = $user->savedSearches()->create([
            'name' => 'Alert Test',
            'listing_purpose' => 'sale',
            'filters' => ['city' => 'London'],
            'notify_email' => false,
        ]);

        // Toggle ON
        $response = $this->actingAs($user)->putJson("/api/saved-searches/{$search->id}/toggle-alert");

        $response->assertStatus(200)
            ->assertJsonPath('notify_email', true);

        $this->assertTrue($search->fresh()->notify_email);

        // Toggle OFF
        $this->actingAs($user)->putJson("/api/saved-searches/{$search->id}/toggle-alert")
            ->assertStatus(200)
            ->assertJsonPath('notify_email', false);

        $this->assertFalse($search->fresh()->notify_email);

        // Guard ownership
        $this->actingAs($otherUser)->putJson("/api/saved-searches/{$search->id}/toggle-alert")
            ->assertStatus(403);
    }
}
