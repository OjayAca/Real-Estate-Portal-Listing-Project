<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Support\ImageUrlResolver;
use Illuminate\Notifications\DatabaseNotification;

trait FormatsResources
{
    public function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'email_verified_at' => optional($user->email_verified_at)->toIso8601String(),
            'phone' => $user->phone,
            'role' => $user->role->value,
            'is_active' => $user->is_active,
            'created_at' => optional($user->created_at)->toIso8601String(),
            'agent_profile' => $user->relationLoaded('agentProfile') && $user->agentProfile
                ? $this->formatAgent($user->agentProfile)
                : null,
        ];
    }

    public function formatAgent(Agent $agent): array
    {
        return [
            'agent_id' => $agent->agent_id,
            'user_id' => $agent->user_id,
            'full_name' => $agent->full_name,
            'email' => $agent->email,
            'phone' => $agent->phone,
            'license_number' => $agent->license_number,
            'agency_id' => $agent->agency_id,
            'agency_name' => $agent->agency_name,
            'agency' => $agent->relationLoaded('agency') && $agent->agency ? [
                'agency_id' => $agent->agency->agency_id,
                'name' => $agent->agency->name,
                'slug' => $agent->agency->slug,
                'agency_type' => $agent->agency->agency_type,
            ] : null,
            'approval_status' => $agent->approval_status,
            'bio' => $agent->bio,
        ];
    }

    public function formatAmenity(Amenity $amenity): array
    {
        return [
            'amenity_id' => $amenity->amenity_id,
            'amenity_name' => $amenity->amenity_name,
            'amenity_category' => $amenity->amenity_category,
        ];
    }

    public function formatProperty(Property $property): array
    {
        return [
            'property_id' => $property->property_id,
            'title' => $property->title,
            'slug' => $property->slug,
            'description' => $property->description,
            'property_type' => $property->property_type,
            'price' => (float) $property->price,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'parking_spaces' => $property->parking_spaces,
            'area_sqm' => $property->area_sqm,
            'address_line' => $property->address_line,
            'city' => $property->city,
            'province' => $property->province,
            'status' => $property->status,
            'featured_image' => ImageUrlResolver::resolve($property->featured_image),
            'listed_at' => optional($property->listed_at)->toIso8601String(),
            'created_at' => optional($property->created_at)->toIso8601String(),
            'inquiries_count' => $property->inquiries_count ?? null,
            'agent' => $property->relationLoaded('agent') && $property->agent
                ? $this->formatAgent($property->agent)
                : null,
            'amenities' => $property->relationLoaded('amenities')
                ? $property->amenities->map(fn (Amenity $amenity) => $this->formatAmenity($amenity))->values()
                : [],
        ];
    }

    public function formatInquiry(Inquiry $inquiry): array
    {
        return [
            'inquiry_id' => $inquiry->inquiry_id,
            'buyer_name' => $inquiry->buyer_name,
            'buyer_email' => $inquiry->buyer_email,
            'buyer_phone' => $inquiry->buyer_phone,
            'message' => $inquiry->message,
            'status' => $inquiry->status,
            'response_message' => $inquiry->response_message,
            'responded_at' => optional($inquiry->responded_at)->toIso8601String(),
            'buyer_reply' => $inquiry->buyer_reply,
            'buyer_replied_at' => optional($inquiry->buyer_replied_at)->toIso8601String(),
            'created_at' => optional($inquiry->created_at)->toIso8601String(),
            'user' => $inquiry->relationLoaded('user') && $inquiry->user ? [
                'id' => $inquiry->user->id,
                'full_name' => $inquiry->user->full_name,
                'email' => $inquiry->user->email,
            ] : null,
            'property' => $inquiry->relationLoaded('property') && $inquiry->property ? [
                'property_id' => $inquiry->property->property_id,
                'title' => $inquiry->property->title,
                'city' => $inquiry->property->city,
                'province' => $inquiry->property->province,
                'status' => $inquiry->property->status,
            ] : null,
        ];
    }

    public function formatBooking(ViewingBooking $booking): array
    {
        $property = $booking->relationLoaded('property') ? $booking->property : null;
        $agent = $property?->relationLoaded('agent') ? $property->agent : null;

        return [
            'booking_id' => $booking->booking_id,
            'buyer_name' => $booking->buyer_name,
            'buyer_email' => $booking->buyer_email,
            'buyer_phone' => $booking->buyer_phone,
            'notes' => $booking->notes,
            'status' => $booking->status,
            'agent_response' => $booking->agent_response,
            'agent_responded_at' => optional($booking->agent_responded_at)->toIso8601String(),
            'scheduled_start' => optional($booking->scheduled_start)->toIso8601String(),
            'scheduled_end' => optional($booking->scheduled_end)->toIso8601String(),
            'property' => $property ? [
                'property_id' => $property->property_id,
                'title' => $property->title,
                'city' => $property->city,
                'province' => $property->province,
            ] : null,
            'agent' => $agent ? [
                'agent_id' => $agent->agent_id,
                'full_name' => $agent->full_name,
                'agency_name' => $agent->agency_name,
            ] : null,
            'user' => $booking->relationLoaded('user') && $booking->user ? [
                'id' => $booking->user->id,
                'full_name' => $booking->user->full_name,
            ] : null,
        ];
    }

    public function formatNotification(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->data['title'] ?? 'Notification',
            'message' => $notification->data['message'] ?? '',
            'data' => $notification->data,
            'read_at' => optional($notification->read_at)->toIso8601String(),
            'created_at' => optional($notification->created_at)->toIso8601String(),
        ];
    }
}
