<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\BuyerAgentInteraction;
use App\Models\Property;
use App\Models\SellerLead;
use App\Models\User;
use App\Notifications\PropertyStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InAppNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_and_mark_notifications_read(): void
    {
        $user = User::factory()->create();

        $user->notify(new PropertyStatusNotification(
            'property_status_updated',
            'Property Status Updated',
            'Your listing status changed.',
            ['property_id' => 123, 'action_url' => '/dashboard'],
        ));

        $notificationId = $user->notifications()->firstOrFail()->id;

        $this->actingAs($user)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('data.0.id', $notificationId)
            ->assertJsonPath('data.0.type', 'property_status_updated')
            ->assertJsonPath('data.0.data.title', 'Property Status Updated');

        $this->actingAs($user)
            ->postJson("/api/notifications/{$notificationId}/read")
            ->assertOk();

        $this->assertNotNull($user->notifications()->firstOrFail()->read_at);

        $this->actingAs($user)
            ->postJson('/api/notifications/read-all')
            ->assertOk();
    }

    public function test_property_inquiry_creates_in_app_notification_for_listing_agent(): void
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => UserRole::USER]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);

        $this->actingAs($buyer)
            ->postJson("/api/properties/{$property->property_id}/inquiries", [
                'message' => 'I would like more information about this property listing.',
            ])
            ->assertCreated();

        $notification = $agentUser->notifications()->firstOrFail();

        $this->assertSame('property_inquiry_received', $notification->data['notification_type']);
        $this->assertSame($property->property_id, $notification->data['property_id']);
        $this->assertSame($buyer->full_name, $notification->data['buyer_name']);
    }

    public function test_viewing_request_creates_in_app_notification_for_listing_agent(): void
    {
        Mail::fake();

        $buyer = User::factory()->create(['role' => UserRole::USER]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);

        $this->actingAs($buyer)
            ->postJson("/api/properties/{$property->property_id}/viewings", [
                'scheduled_start' => 'May 8, 2026 10:00 AM',
                'notes' => 'Please confirm if this slot is available.',
            ])
            ->assertCreated();

        $notification = $agentUser->notifications()->firstOrFail();

        $this->assertSame('viewing_request_received', $notification->data['notification_type']);
        $this->assertSame('May 8, 2026 10:00 AM', $notification->data['scheduled_start']);
    }

    public function test_admin_property_status_change_notifies_listing_agent(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $property = Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'status' => 'Pending Sold',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/properties/{$property->property_id}", [
                'status' => 'Sold',
                'status_reason' => 'Admin verified closing documents.',
            ])
            ->assertOk();

        $notification = $agentUser->notifications()->firstOrFail();

        $this->assertSame('property_status_updated', $notification->data['notification_type']);
        $this->assertSame('Pending Sold', $notification->data['old_status']);
        $this->assertSame('Sold', $notification->data['new_status']);
    }

    public function test_admin_seller_lead_assignment_notifies_newly_assigned_agent(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $lead = $this->createSellerLead();

        $this->actingAs($admin)
            ->patchJson("/api/admin/seller-leads/{$lead->seller_lead_id}", [
                'assigned_agent_id' => $agent->agent_id,
            ])
            ->assertOk();

        $notification = $agentUser->notifications()->firstOrFail();

        $this->assertSame('seller_lead_assigned', $notification->data['notification_type']);
        $this->assertSame('Seller Lead Assigned', $notification->data['title']);
        $this->assertSame('/dashboard', $notification->data['action_url']);
        $this->assertSame($lead->seller_lead_id, $notification->data['seller_lead_id']);
    }

    public function test_clearing_seller_lead_assignment_does_not_notify_agent(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $lead = $this->createSellerLead(['assigned_agent_id' => $agent->agent_id]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/seller-leads/{$lead->seller_lead_id}", [
                'assigned_agent_id' => null,
            ])
            ->assertOk();

        $this->assertSame(0, $agentUser->notifications()->count());
    }

    public function test_resaving_same_seller_lead_assignment_does_not_duplicate_notification(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        [$agentUser, $agent] = $this->createApprovedAgent();
        $lead = $this->createSellerLead(['assigned_agent_id' => $agent->agent_id]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/seller-leads/{$lead->seller_lead_id}", [
                'status' => 'Contacted',
                'assigned_agent_id' => $agent->agent_id,
            ])
            ->assertOk();

        $this->assertSame(0, $agentUser->notifications()->count());
    }

    public function test_new_review_creates_in_app_notification_for_agent(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::USER]);
        [$agentUser, $agent] = $this->createApprovedAgent();

        BuyerAgentInteraction::query()->create([
            'user_id' => $buyer->id,
            'agent_id' => $agent->agent_id,
            'interaction_type' => 'inquiry',
        ]);

        $this->actingAs($buyer)
            ->postJson("/api/agents/{$agent->agent_id}/reviews", [
                'rating' => 5,
                'review_text' => 'Clear communication and excellent market knowledge.',
            ])
            ->assertOk();

        $notification = $agentUser->notifications()->firstOrFail();

        $this->assertSame('agent_review_received', $notification->data['notification_type']);
        $this->assertSame(5, $notification->data['rating']);
    }

    /**
     * @return array{0: User, 1: Agent}
     */
    private function createApprovedAgent(): array
    {
        $user = User::factory()->create([
            'role' => UserRole::AGENT,
        ]);

        $agent = Agent::factory()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'approval_status' => 'approved',
        ]);

        return [$user, $agent];
    }

    private function createSellerLead(array $attributes = []): SellerLead
    {
        return SellerLead::query()->create(array_merge([
            'full_name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'phone' => '09171234567',
            'property_type' => 'House',
            'property_address' => '18 Mango Street, Makati',
            'bedrooms' => 3,
            'bathrooms' => 2,
            'condition_of_home' => 'Good',
            'expected_price' => 7200000,
            'status' => 'New',
        ], $attributes));
    }
}
