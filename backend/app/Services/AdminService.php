<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminService
{
    private const AGENT_STATUSES = ['pending', 'approved', 'suspended'];
    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive'];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PortalService $portal,
    ) {}

    public function adminOverview(Request $request): JsonResponse
    {
        $userSearch = $request->query('user_search');
        $agentSearch = $request->query('agent_search');
        $propertySearch = $request->query('property_search');

        $usersQuery = User::query()->with('agentProfile')->latest();
        if ($userSearch) {
            $usersQuery->where(function ($query) use ($userSearch): void {
                $query->where('first_name', 'like', "%{$userSearch}%")
                    ->orWhere('last_name', 'like', "%{$userSearch}%")
                    ->orWhere('email', 'like', "%{$userSearch}%");
            });
        }
        $users = $usersQuery->paginate(15, ['*'], 'users_page')->withQueryString();

        $agentsQuery = Agent::query()->with('user')->latest();
        if ($agentSearch) {
            $agentsQuery->where(function ($query) use ($agentSearch): void {
                $query->where('first_name', 'like', "%{$agentSearch}%")
                    ->orWhere('last_name', 'like', "%{$agentSearch}%")
                    ->orWhere('agency_name', 'like', "%{$agentSearch}%")
                    ->orWhere('email', 'like', "%{$agentSearch}%");
            });
        }
        $agents = $agentsQuery->paginate(15, ['*'], 'agents_page')->withQueryString();

        $propertiesQuery = Property::query()->with(['agent.user', 'amenities'])->latest();
        if ($propertySearch) {
            $propertiesQuery->where(function ($query) use ($propertySearch): void {
                $query->where('title', 'like', "%{$propertySearch}%")
                    ->orWhere('city', 'like', "%{$propertySearch}%")
                    ->orWhere('province', 'like', "%{$propertySearch}%")
                    ->orWhere('address_line', 'like', "%{$propertySearch}%");
            });
        }
        $properties = $propertiesQuery->paginate(15, ['*'], 'properties_page')->withQueryString();

        $inquiries = Inquiry::query()->with(['property.agent.user', 'user'])->latest()->take(10)->get();

        $userGrowth = User::query()
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => ['month' => $item->month, 'users' => $item->count]);

        $propertyDistribution = Property::query()
            ->select('status', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get();

        $inquiryVolume = Inquiry::query()
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => ['month' => $item->month, 'inquiries' => $item->count]);

        return response()->json([
            'stats' => [
                'users' => User::query()->count(),
                'agents' => Agent::query()->count(),
                'available_properties' => Property::query()->where('status', 'Available')->count(),
                'pending_agents' => Agent::query()->where('approval_status', 'pending')->count(),
                'open_inquiries' => Inquiry::query()->whereIn('status', ['New', 'Read'])->count(),
            ],
            'analytics' => [
                'user_growth' => $userGrowth,
                'property_distribution' => $propertyDistribution,
                'inquiry_volume' => $inquiryVolume,
            ],
            'users' => [
                'data' => collect($users->items())->map(fn (User $user) => $this->portal->formatUser($user)),
                'meta' => $this->formatPaginationMeta($users),
            ],
            'agents' => [
                'data' => collect($agents->items())->map(fn (Agent $agent) => $this->portal->formatAgent($agent)),
                'meta' => $this->formatPaginationMeta($agents),
            ],
            'properties' => [
                'data' => collect($properties->items())->map(fn (Property $property) => $this->portal->formatProperty($property)),
                'meta' => $this->formatPaginationMeta($properties),
            ],
            'inquiries' => $inquiries->map(fn (Inquiry $inquiry) => $this->portal->formatInquiry($inquiry)),
        ]);
    }

    public function adminUserUpdate(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
            'role' => ['nullable', Rule::in(UserRole::values())],
        ]);

        if ($user->isAdmin() && $validated['is_active'] === false) {
            return response()->json(['message' => 'Administrator accounts cannot be suspended.'], 403);
        }

        if (($validated['role'] ?? null) === UserRole::AGENT->value && ! $user->agentProfile) {
            return response()->json(['message' => 'Create an agent profile before promoting this user to agent.'], 422);
        }

        if ($user->isAgent() && ($validated['role'] ?? $user->role->value) !== UserRole::AGENT->value) {
            $activeListings = Property::query()
                ->where('agent_id', $user->agentProfile?->agent_id)
                ->whereIn('status', ['Available', 'Sold', 'Rented'])
                ->count();

            if ($activeListings > 0) {
                return response()->json(['message' => 'This agent has active or historical listings and cannot be demoted. Delete or reassign listings first.'], 422);
            }
        }

        $user->update([
            'is_active' => $validated['is_active'],
            'role' => $validated['role'] ?? $user->role->value,
        ]);

        return response()->json([
            'message' => 'User updated.',
            'data' => $this->portal->formatUser($user->fresh()->load('agentProfile')),
        ]);
    }

    public function adminAgentUpdate(Request $request, Agent $agent): JsonResponse
    {
        $validated = $request->validate([
            'approval_status' => ['required', Rule::in(self::AGENT_STATUSES)],
        ]);

        $agent->update(['approval_status' => $validated['approval_status']]);

        if ($agent->isApproved()) {
            $this->portal->ensureDefaultAvailability($agent);
        }

        if ($agent->user) {
            $this->notifications->pushNotification(
                $agent->user,
                'agent.status',
                'Agent profile updated',
                'Your agent approval status is now '.Str::headline($agent->approval_status).'.',
                ['agent_id' => $agent->agent_id]
            );
        }

        return response()->json([
            'message' => 'Agent status updated.',
            'data' => $this->portal->formatAgent($agent->fresh()->load('user')),
        ]);
    }

    public function adminPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::PROPERTY_STATUSES)],
        ]);

        $property->loadMissing('agent.user', 'amenities');
        $property->update(['status' => $validated['status']]);

        if ($property->agent?->user) {
            $this->notifications->pushNotification(
                $property->agent->user,
                'property.status',
                'Listing status changed',
                $property->title.' is now marked as '.$property->status.'.',
                ['property_id' => $property->property_id]
            );
        }

        return response()->json([
            'message' => 'Property status updated.',
            'data' => $this->portal->formatProperty($property->fresh()->load(['agent.user', 'amenities'])),
        ]);
    }

    private function formatPaginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
