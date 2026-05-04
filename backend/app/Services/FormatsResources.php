<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\SellerLead;
use App\Models\User;
use App\Support\ImageUrlResolver;

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
            'listing_purpose' => $property->listing_purpose,
            'price' => (float) $property->price,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'parking_spaces' => $property->parking_spaces,
            'area_sqm' => $property->area_sqm,
            'address_line' => $property->address_line,
            'city' => $property->city,
            'province' => $property->province,
            'status' => $property->status,
            'views_count' => $property->views_count,
            'featured_image' => ImageUrlResolver::resolve($property->featured_image),
            'listed_at' => optional($property->listed_at)->toIso8601String(),
            'created_at' => optional($property->created_at)->toIso8601String(),
            'agent' => $property->relationLoaded('agent') && $property->agent
                ? $this->formatAgent($property->agent)
                : null,
            'amenities' => $property->relationLoaded('amenities')
                ? $property->amenities->map(fn (Amenity $amenity) => $this->formatAmenity($amenity))->values()
                : [],
            'status_logs' => $property->relationLoaded('statusLogs')
                ? $property->statusLogs->sortByDesc('created_at')->map(fn ($log) => [
                    'status_log_id' => $log->status_log_id,
                    'old_status' => $log->old_status,
                    'new_status' => $log->new_status,
                    'reason' => $log->reason,
                    'created_at' => $log->created_at->toIso8601String(),
                    'user_name' => $log->user?->full_name,
                ])->values()
                : [],
        ];
    }

    public function formatSellerLead(SellerLead $lead): array
    {
        return [
            'seller_lead_id' => $lead->seller_lead_id,
            'full_name' => $lead->full_name,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'property_type' => $lead->property_type,
            'property_address' => $lead->property_address,
            'bedrooms' => $lead->bedrooms,
            'bathrooms' => $lead->bathrooms,
            'home_size' => $lead->home_size !== null ? (float) $lead->home_size : null,
            'lot_size' => $lead->lot_size !== null ? (float) $lead->lot_size : null,
            'condition_of_home' => $lead->condition_of_home,
            'expected_price' => $lead->expected_price !== null ? (float) $lead->expected_price : null,
            'notes' => $lead->notes,
            'status' => $lead->status,
            'assigned_agent_id' => $lead->assigned_agent_id,
            'assigned_agent' => $lead->relationLoaded('assignedAgent') && $lead->assignedAgent
                ? $this->formatAgent($lead->assignedAgent)
                : null,
            'created_at' => optional($lead->created_at)->toIso8601String(),
        ];
    }
}
