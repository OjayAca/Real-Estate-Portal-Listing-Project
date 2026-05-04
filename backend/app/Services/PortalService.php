<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyStatusLog;
use App\Models\SellerLead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PortalService
{
    use FormatsResources;

    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function logStatusChange(Property $property, User $user, string $oldStatus, string $newStatus, ?string $reason = null): void
    {
        PropertyStatusLog::query()->create([
            'property_id' => $property->property_id,
            'user_id' => $user->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'reason' => $reason,
        ]);

        if (str_starts_with($newStatus, 'Pending')) {
            $admins = User::query()->where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $this->notifications->pushNotification(
                    $admin,
                    'property_status_change',
                    'Property Status Change Request',
                    "Agent {$user->full_name} has requested to mark property '{$property->title}' as ".str_replace('Pending ', '', $newStatus).'.',
                    ['property_id' => $property->property_id]
                );
            }
        }
    }

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
                        'seller_leads' => 0,
                        'new_seller_leads' => 0,
                    ],
                    'profile' => $this->formatAgent($agent),
                    'properties' => [],
                    'assigned_seller_leads' => [],
                ]);
            }

            $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->take(5)->get();
            $sellerLeads = SellerLead::query()
                ->with('assignedAgent')
                ->where('assigned_agent_id', $agent->agent_id)
                ->latest()
                ->get();

            return response()->json([
                'role' => $user->role->value,
                'stats' => [
                    'properties' => Property::query()->where('agent_id', $agent->agent_id)->count(),
                    'active_listings' => Property::query()->where('agent_id', $agent->agent_id)->where('status', 'Available')->count(),
                    'seller_leads' => $sellerLeads->count(),
                    'new_seller_leads' => $sellerLeads->where('status', 'New')->count(),
                ],
                'profile' => $this->formatAgent($agent),
                'properties' => $properties->map(fn (Property $entry) => $this->formatProperty($entry)),
                'assigned_seller_leads' => $sellerLeads->map(fn (SellerLead $lead) => $this->formatSellerLead($lead)),
            ]);
        }

        $saved = $user->savedProperties()->with(['agent.user', 'amenities'])->latest()->take(6)->get();

        return response()->json([
            'role' => $user->role->value,
            'stats' => [
                'saved_properties' => $user->savedProperties()->count(),
            ],
            'saved_properties' => $saved->map(fn (Property $entry) => $this->formatProperty($entry)),
        ]);
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

    public function resolveAgency(string $name): Agency
    {
        return Agency::query()->firstOrCreate(
            ['name' => $name],
            [
                'slug' => Str::slug($name),
                'agency_type' => 'Agency',
            ]
        );
    }
}
