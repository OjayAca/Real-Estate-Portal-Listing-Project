<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\SellerLead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class AdminService
{
    private const AGENT_STATUSES = ['pending', 'approved', 'suspended'];
    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive', 'Pending Sold', 'Pending Rented'];
    private const SELLER_LEAD_STATUSES = ['New', 'Contacted', 'Converted'];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PortalService $portal,
    ) {}

    public function adminOverview(Request $request): JsonResponse
    {
        $users = $this->getPaginatedUsers($request->query('user_search'));
        $agents = $this->getPaginatedAgents($request->query('agent_search'));
        $properties = $this->getPaginatedProperties($request->query('property_search'));
        $sellerLeads = $this->getPaginatedSellerLeads();

        // Fetch properties awaiting status approval
        $pendingApprovals = Property::query()
            ->with(['agent.user', 'statusLogs.user'])
            ->whereIn('status', ['Pending Sold', 'Pending Rented'])
            ->get();

        return response()->json([
            'stats' => $this->getGeneralStats(),
            'analytics' => $this->getAnalyticsData(),
            'pending_property_approvals' => $pendingApprovals->map(fn (Property $p) => $this->portal->formatProperty($p)),
            'assignable_agents' => $this->getAssignableAgents(),
            'seller_leads' => [
                'data' => collect($sellerLeads->items())->map(fn (SellerLead $lead) => $this->portal->formatSellerLead($lead)),
                'meta' => $this->formatPaginationMeta($sellerLeads),
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
        ]);
    }

    private function getPaginatedUsers(?string $search)
    {
        $query = User::query()->with('agentProfile')->latest();
        if ($search) {
            $query->where(function ($q) use ($search): void {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        return $query->paginate(15, ['*'], 'users_page')->withQueryString();
    }

    private function getPaginatedAgents(?string $search)
    {
        $query = Agent::query()->with('user')->latest();
        if ($search) {
            $query->where(function ($q) use ($search): void {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('agency_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        return $query->paginate(15, ['*'], 'agents_page')->withQueryString();
    }

    private function getPaginatedProperties(?string $search)
    {
        $query = Property::query()->with(['agent.user', 'amenities'])->latest();
        if ($search) {
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%")
                    ->orWhere('address_line', 'like', "%{$search}%");
            });
        }
        return $query->paginate(15, ['*'], 'properties_page')->withQueryString();
    }

    private function getPaginatedSellerLeads()
    {
        return SellerLead::query()
            ->with('assignedAgent')
            ->latest()
            ->paginate(15, ['*'], 'seller_leads_page')
            ->withQueryString();
    }

    private function getAssignableAgents()
    {
        return Agent::query()
            ->where('approval_status', 'approved')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Agent $agent) => $this->portal->formatAgent($agent));
    }

    private function getAnalyticsData(): array
    {
        $isSqlite = DB::getDriverName() === 'sqlite';
        $monthFormat = $isSqlite ? 'strftime("%Y-%m", created_at)' : 'DATE_FORMAT(created_at, "%Y-%m")';

        $userGrowth = User::query()
            ->select(DB::raw("$monthFormat as month"), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => ['month' => $item->month, 'users' => $item->count]);

        $propertyDistribution = Property::query()
            ->select('status', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get();

        return [
            'user_growth' => $userGrowth,
            'property_distribution' => $propertyDistribution,
        ];
    }


    private function getGeneralStats(): array
    {
        return [
            'users' => User::query()->count(),
            'agents' => Agent::query()->count(),
            'available_properties' => Property::query()->where('status', 'Available')->count(),
            'pending_agents' => Agent::query()->where('approval_status', 'pending')->count(),
            'pending_approvals' => Property::query()->whereIn('status', ['Pending Sold', 'Pending Rented'])->count(),
            'seller_leads' => SellerLead::query()->count(),
            'new_seller_leads' => SellerLead::query()->where('status', 'New')->count(),
            'total_views' => Property::query()->sum('views_count'),
        ];
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

    public function adminUserDestroy(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'confirmation' => ['required', 'string'],
        ]);

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Administrator accounts cannot be deleted.'], 403);
        }

        $expectedConfirmation = "DELETE {$user->email}";
        if (! hash_equals($expectedConfirmation, $validated['confirmation'])) {
            return response()->json(['message' => "Type {$expectedConfirmation} to permanently delete this user."], 422);
        }

        $user->load('agentProfile');
        if ($user->agentProfile) {
            $listingCount = Property::query()
                ->where('agent_id', $user->agentProfile->agent_id)
                ->count();

            if ($listingCount > 0) {
                return response()->json(['message' => 'This agent owns property listings. Reassign or delete those listings before deleting the user account.'], 422);
            }
        }

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            if (Schema::hasTable('notifications')) {
                $user->notifications()->delete();
            }
            $user->delete();
        });

        return response()->json([
            'message' => 'User permanently deleted.',
        ]);
    }

    public function adminSellerLeadUpdate(Request $request, SellerLead $sellerLead): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'required', Rule::in(self::SELLER_LEAD_STATUSES)],
            'assigned_agent_id' => [
                'sometimes',
                'nullable',
                Rule::exists('agents', 'agent_id')->where(fn ($query) => $query->where('approval_status', 'approved')),
            ],
        ]);

        if (! array_key_exists('status', $validated) && ! array_key_exists('assigned_agent_id', $validated)) {
            return response()->json(['message' => 'Provide a status or assigned agent update.'], 422);
        }

        $sellerLead->update($validated);

        return response()->json([
            'message' => 'Seller lead updated.',
            'data' => $this->portal->formatSellerLead($sellerLead->fresh()->load('assignedAgent')),
        ]);
    }

    public function adminAgentUpdate(Request $request, Agent $agent): JsonResponse
    {
        $validated = $request->validate([
            'approval_status' => ['required', Rule::in(self::AGENT_STATUSES)],
        ]);

        $agent->update(['approval_status' => $validated['approval_status']]);

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

        DB::transaction(function () use ($property, $request, $validated): void {
            $oldStatus = $property->status;
            $property->update(['status' => $validated['status']]);

            if ($validated['status'] !== $oldStatus) {
                $this->portal->logStatusChange($property, $request->user(), $oldStatus, $validated['status'], $request->input('status_reason'));

                if ($property->agent?->user) {
                    $this->notifications->pushNotification(
                        $property->agent->user,
                        'property_status_updated',
                        'Property Status Updated',
                        "Your listing '{$property->title}' was changed from {$oldStatus} to {$validated['status']}.",
                        [
                            'property_id' => $property->property_id,
                            'old_status' => $oldStatus,
                            'new_status' => $validated['status'],
                            'action_url' => '/dashboard',
                        ],
                    );
                }
            }
        });

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
