<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Models\Inquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PortalService
{
    use FormatsResources;

    public function amenitiesIndex(): JsonResponse
    {
        $amenities = Amenity::query()->orderBy('amenity_category')->orderBy('amenity_name')->get();

        return response()->json([
            'data' => $amenities->map(fn (Amenity $amenity) => $this->formatAmenity($amenity)),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('agentProfile.agency');

        if ($user->isAdmin()) {
            return response()->json([
                'role' => $user->role->value,
                'stats' => [
                    'users' => User::query()->count(),
                    'agents' => Agent::query()->count(),
                    'properties' => Property::query()->count(),
                    'inquiries' => Inquiry::query()->count(),
                    'bookings' => ViewingBooking::query()->count(),
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ],
                'recent_users' => User::query()->with('agentProfile')->latest()->take(5)->get()->map(fn (User $entry) => $this->formatUser($entry)),
                'recent_properties' => Property::query()->with(['agent.user', 'amenities'])->latest()->take(5)->get()->map(fn (Property $entry) => $this->formatProperty($entry)),
            ]);
        }

        if ($user->isAgent()) {
            $agent = $user->agentProfile;

            if (! $agent) {
                abort(404, 'No agent profile is linked to this account.');
            }

            if (! $agent->isApproved()) {
                return response()->json([
                    'role' => $user->role->value,
                    'stats' => [
                        'properties' => 0,
                        'active_listings' => 0,
                        'new_inquiries' => 0,
                        'closed_inquiries' => 0,
                        'unread_notifications' => $user->unreadNotifications()->count(),
                    ],
                    'profile' => $this->formatAgent($agent),
                    'properties' => [],
                    'recent_inquiries' => [],
                ]);
            }

            $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->take(5)->get();
            $inquiries = Inquiry::query()->with(['property.agent.user', 'user'])
                ->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))
                ->latest()
                ->take(6)
                ->get();

            return response()->json([
                'role' => $user->role->value,
                'stats' => [
                    'properties' => Property::query()->where('agent_id', $agent->agent_id)->count(),
                    'active_listings' => Property::query()->where('agent_id', $agent->agent_id)->where('status', 'Available')->count(),
                    'new_inquiries' => Inquiry::query()->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))->where('status', 'New')->count(),
                    'closed_inquiries' => Inquiry::query()->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))->where('status', 'Closed')->count(),
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ],
                'profile' => $this->formatAgent($agent),
                'properties' => $properties->map(fn (Property $entry) => $this->formatProperty($entry)),
                'recent_inquiries' => $inquiries->map(fn (Inquiry $entry) => $this->formatInquiry($entry)),
            ]);
        }

        $saved = $user->savedProperties()->with(['agent.user', 'amenities'])->latest()->take(6)->get();
        $inquiries = $user->inquiries()->with(['property.agent.user'])->latest()->take(6)->get();
        $bookings = $user->viewingBookings()->with(['property.agent.user'])->latest()->take(6)->get();

        return response()->json([
            'role' => $user->role->value,
            'stats' => [
                'saved_properties' => $user->savedProperties()->count(),
                'inquiries' => $user->inquiries()->count(),
                'viewing_bookings' => $user->viewingBookings()->count(),
                'unread_notifications' => $user->unreadNotifications()->count(),
            ],
            'saved_properties' => $saved->map(fn (Property $entry) => $this->formatProperty($entry)),
            'recent_inquiries' => $inquiries->map(fn (Inquiry $entry) => $this->formatInquiry($entry)),
            'recent_bookings' => $bookings->map(fn (ViewingBooking $entry) => $this->formatBooking($entry)),
        ]);
    }

    public function ensureDefaultAvailability(Agent $agent): void
    {
        if (DB::table('agent_availabilities')->where('agent_id', $agent->agent_id)->exists()) {
            return;
        }

        foreach ([1, 2, 3, 4, 5] as $day) {
            DB::table('agent_availabilities')->insert([
                'agent_id' => $agent->agent_id,
                'day_of_week' => $day,
                'start_time' => '09:00',
                'end_time' => '17:00',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function requireApprovedAgent(User $user): Agent
    {
        $agent = $user->agentProfile;

        if (! $agent) {
            abort(404, 'No agent profile is linked to this account.');
        }

        if (! $agent->isApproved()) {
            abort(403, 'Your agent profile is not approved yet.');
        }

        return $agent;
    }

    public function guardOwnProperty(Agent $agent, Property $property): void
    {
        if ($property->agent_id !== $agent->agent_id) {
            abort(403, 'This property does not belong to the authenticated agent.');
        }
    }

    public function resolveAgency(string $name): \App\Models\Agency
    {
        return \App\Models\Agency::query()->firstOrCreate(
            ['name' => $name],
            [
                'slug' => \Illuminate\Support\Str::slug($name),
                'agency_type' => 'Agency',
            ]
        );
    }
}
