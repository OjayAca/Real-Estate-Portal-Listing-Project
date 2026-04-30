<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use App\Models\Inquiry;
use App\Models\ViewingBooking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class BookingAndInquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_inquiry(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $agentUser = User::factory()->create(['role' => 'agent']);
        $agent = Agent::factory()->create(['user_id' => $agentUser->id, 'approval_status' => 'approved']);
        $property = Property::factory()->create(['agent_id' => $agent->agent_id, 'status' => 'Available']);

        $response = $this->actingAs($user)->postJson("/api/properties/{$property->property_id}/inquiries", [
            'message' => 'This is a test inquiry message with more than 10 characters.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('inquiries', [
            'property_id' => $property->property_id,
            'user_id' => $user->id,
            'status' => 'New',
        ]);
        
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $agentUser->id,
            'type' => 'inquiry.new',
        ]);
    }

    public function test_user_can_book_viewing(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $agentUser = User::factory()->create(['role' => 'agent']);
        $agent = Agent::factory()->create(['user_id' => $agentUser->id, 'approval_status' => 'approved']);
        $property = Property::factory()->create(['agent_id' => $agent->agent_id, 'status' => 'Available']);

        // Create availability for the agent
        $now = Carbon::now()->next(Carbon::MONDAY);
        $agent->availabilities()->create([
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '17:00',
            'is_active' => true,
        ]);

        $startTime = $now->copy()->setHour(10)->setMinute(0)->setSecond(0);

        $response = $this->actingAs($user)->postJson("/api/properties/{$property->property_id}/viewings", [
            'scheduled_start' => $startTime->toIso8601String(),
            'notes' => 'Looking forward to seeing the unit.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('viewing_bookings', [
            'property_id' => $property->property_id,
            'user_id' => $user->id,
            'agent_id' => $agent->agent_id,
            'status' => 'Pending',
        ]);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $agentUser->id,
            'type' => 'booking.new',
        ]);
    }

    public function test_agent_can_respond_to_inquiry(): void
    {
        $user = User::factory()->create();
        $agentUser = User::factory()->create(['role' => 'agent', 'email_verified_at' => now()]);
        $agent = Agent::factory()->create(['user_id' => $agentUser->id, 'approval_status' => 'approved']);
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);
        $inquiry = Inquiry::factory()->create(['property_id' => $property->property_id, 'user_id' => $user->id]);

        $response = $this->actingAs($agentUser)->patchJson("/api/agent/inquiries/{$inquiry->inquiry_id}", [
            'status' => 'Responded',
            'response_message' => 'Thank you for your interest. The property is available.',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('inquiries', [
            'inquiry_id' => $inquiry->inquiry_id,
            'status' => 'Responded',
            'response_message' => 'Thank you for your interest. The property is available.',
        ]);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $user->id,
            'type' => 'inquiry.update',
        ]);
    }

    public function test_agent_cannot_review_themselves(): void
    {
        $agentUser = User::factory()->create(['role' => 'agent', 'email_verified_at' => now()]);
        $agent = Agent::factory()->create(['user_id' => $agentUser->id, 'approval_status' => 'approved']);
        
        $response = $this->actingAs($agentUser)->postJson("/api/agents/{$agent->agent_id}/reviews", [
            'rating' => 5,
            'review_text' => 'I am the best!',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'You cannot review yourself.');
    }
}
