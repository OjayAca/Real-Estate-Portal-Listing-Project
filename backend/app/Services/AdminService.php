<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\SellerLead;
use App\Models\User;
use App\Models\ViewingRequest;
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
    ) {
    }

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
            'pending_property_approvals' => $pendingApprovals->map(fn(Property $p) => $this->portal->formatProperty($p)),
            'assignable_agents' => $this->getAssignableAgents(),
            'seller_leads' => [
                'data' => collect($sellerLeads->items())->map(fn(SellerLead $lead) => $this->portal->formatSellerLead($lead)),
                'meta' => $this->formatPaginationMeta($sellerLeads),
            ],
            'users' => [
                'data' => collect($users->items())->map(fn(User $user) => $this->portal->formatUser($user)),
                'meta' => $this->formatPaginationMeta($users),
            ],
            'agents' => [
                'data' => collect($agents->items())->map(fn(Agent $agent) => $this->portal->formatAgent($agent)),
                'meta' => $this->formatPaginationMeta($agents),
            ],
            'properties' => [
                'data' => collect($properties->items())->map(fn(Property $property) => $this->portal->formatProperty($property)),
                'meta' => $this->formatPaginationMeta($properties),
            ],
        ]);
    }

    private function getPaginatedUsers(?string $search)
    {
        $query = User::query()->with('agent')->latest();
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
            ->map(fn(Agent $agent) => $this->portal->formatAgent($agent));
    }

    private function getAnalyticsData(): array
    {
        $isSqlite = DB::getDriverName() === 'sqlite';
        $monthFormat = $isSqlite ? 'strftime("%Y-%m", created_at)' : 'DATE_FORMAT(created_at, "%Y-%m")';
        $weekFormat = $isSqlite ? 'strftime("%Y-%W", created_at)' : 'DATE_FORMAT(created_at, "%X-%V")';

        // User Growth (Monthly)
        $userGrowth = User::query()
            ->select(DB::raw("$monthFormat as month"), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => ['month' => $item->month, 'users' => $item->count]);

        // Seller Lead Growth (Monthly)
        $sellerLeadGrowth = SellerLead::query()
            ->select(DB::raw("$monthFormat as month"), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => ['month' => $item->month, 'leads' => $item->count]);

        // Weekly Inquiries (Rolling 12 weeks)
        $weeklyInquiries = Inquiry::query()
            ->select(DB::raw("$weekFormat as week"), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subWeeks(12)->startOfWeek())
            ->groupBy('week')
            ->orderBy('week')
            ->get()
            ->map(fn($item) => ['week' => $item->week, 'inquiries' => $item->count]);

        // Property Status Distribution
        $propertyDistribution = Property::query()
            ->select('status', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get();

        // Top Performing Listings (by views)
        $topListings = Property::query()
            ->select('property_id', 'title', 'views_count', 'city')
            ->orderByDesc('views_count')
            ->take(5)
            ->get();

        // Most Active Agents (by listing count)
        $activeAgents = Agent::query()
            ->withCount('properties')
            ->orderByDesc('properties_count')
            ->take(5)
            ->get()
            ->map(fn($agent) => [
                'name' => "{$agent->first_name} {$agent->last_name}",
                'listings' => $agent->properties_count,
            ]);

        // Geographic Market Insights (Listings vs search traffic)
        $cityListings = Property::query()
            ->select('city', DB::raw('count(*) as count'))
            ->groupBy('city')
            ->orderByDesc('count')
            ->take(10)
            ->get();

        $citySearchInterest = SavedSearch::query()
            ->get()
            ->flatMap(function($search) {
                $filters = $search->filters;
                if (isset($filters['city'])) {
                    return is_array($filters['city']) ? $filters['city'] : [$filters['city']];
                }
                return [];
            })
            ->countBy()
            ->map(fn($count, $city) => ['city' => $city, 'interest' => $count])
            ->values();

        $marketInsights = $cityListings->map(function($item) use ($citySearchInterest) {
            $interest = $citySearchInterest->firstWhere('city', $item->city)['interest'] ?? 0;
            return [
                'city' => $item->city,
                'listings' => $item->count,
                'interest' => $interest,
            ];
        });

        return [
            'user_growth' => $userGrowth,
            'seller_lead_growth' => $sellerLeadGrowth,
            'weekly_inquiries' => $weeklyInquiries,
            'property_distribution' => $propertyDistribution,
            'top_listings' => $topListings,
            'active_agents' => $activeAgents,
            'market_insights' => $marketInsights,
        ];
    }

    private function getGeneralStats(): array
    {
        $viewingRequests = ViewingRequest::query()->count();
        $inquiries = Inquiry::query()->count();
        $conversionRate = $viewingRequests > 0 ? round(($inquiries / $viewingRequests) * 100, 1) : 0;

        return [
            'users' => User::query()->count(),
            'agents' => Agent::query()->count(),
            'available_properties' => Property::query()->where('status', 'Available')->count(),
            'pending_agents' => Agent::query()->where('approval_status', 'pending')->count(),
            'pending_approvals' => Property::query()->whereIn('status', ['Pending Sold', 'Pending Rented'])->count(),
            'seller_leads' => SellerLead::query()->count(),
            'new_seller_leads' => SellerLead::query()->where('status', 'New')->count(),
            'total_views' => Property::query()->sum('views_count'),
            'total_inquiries' => $inquiries,
            'conversion_rate' => $conversionRate,
        ];
    }

    public function adminUserUpdate(array $data, User $user): JsonResponse
    {
        if ($user->isAdmin() && $data['is_active'] === false) {
            return response()->json(['message' => 'Administrator accounts cannot be suspended.'], 403);
        }

        if (($data['role'] ?? null) === UserRole::AGENT->value && !$user->agent) {
            return response()->json(['message' => 'Create an agent profile before promoting this user to agent.'], 422);
        }

        if ($user->isAgent() && ($data['role'] ?? $user->role->value) !== UserRole::AGENT->value) {
            $activeListings = Property::query()
                ->where('agent_id', $user->agent?->agent_id)
                ->whereIn('status', ['Available', 'Sold', 'Rented'])
                ->count();

            if ($activeListings > 0) {
                return response()->json(['message' => 'This agent has active or historical listings and cannot be demoted. Delete or reassign listings first.'], 422);
            }
        }

        $user->update([
            'is_active' => $data['is_active'],
            'role' => $data['role'] ?? $user->role->value,
        ]);

        return response()->json([
            'message' => 'User updated.',
            'data' => $this->portal->formatUser($user->fresh()->load('agent')),
        ]);
    }

    public function adminUserDestroy(array $data, User $user): JsonResponse
    {
        if ($user->isAdmin()) {
            return response()->json(['message' => 'Administrator accounts cannot be deleted.'], 403);
        }

        $expectedConfirmation = "DELETE {$user->email}";
        if (!hash_equals($expectedConfirmation, $data['confirmation'])) {
            return response()->json(['message' => "Type {$expectedConfirmation} to permanently delete this user."], 422);
        }

        $user->load('agent');
        if ($user->agent) {
            $listingCount = Property::query()
                ->where('agent_id', $user->agent->agent_id)
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

    public function adminSellerLeadUpdate(array $data, SellerLead $sellerLead): JsonResponse
    {
        if (!array_key_exists('status', $data) && !array_key_exists('assigned_agent_id', $data)) {
            return response()->json(['message' => 'Provide a status or assigned agent update.'], 422);
        }

        $previousAssignedAgentId = $sellerLead->assigned_agent_id;

        $sellerLead->update($data);

        $nextAssignedAgentId = $data['assigned_agent_id'] ?? null;
        if (
            array_key_exists('assigned_agent_id', $data)
            && $nextAssignedAgentId !== null
            && (int) $nextAssignedAgentId !== (int) $previousAssignedAgentId
        ) {
            $assignedAgent = Agent::query()->with('user')->find($nextAssignedAgentId);

            if ($assignedAgent?->user) {
                $this->notifications->pushNotification(
                    $assignedAgent->user,
                    'seller_lead_assigned',
                    'Seller Lead Assigned',
                    "A seller lead from {$sellerLead->full_name} has been assigned to you.",
                    [
                        'seller_lead_id' => $sellerLead->seller_lead_id,
                        'seller_name' => $sellerLead->full_name,
                        'action_url' => '/dashboard',
                    ],
                );
            }
        }

        return response()->json([
            'message' => 'Seller lead updated.',
            'data' => $this->portal->formatSellerLead($sellerLead->fresh()->load('assignedAgent')),
        ]);
    }

    public function adminAgentUpdate(array $data, Agent $agent): JsonResponse
    {
        $agent->update(['approval_status' => $data['approval_status']]);

        return response()->json([
            'message' => 'Agent status updated.',
            'data' => $this->portal->formatAgent($agent->fresh()->load('user')),
        ]);
    }

    public function adminPropertyUpdate(array $data, Property $property, User $adminUser): JsonResponse
    {
        $property->loadMissing('agent.user', 'amenities');

        DB::transaction(function () use ($property, $adminUser, $data): void {
            $oldStatus = $property->status;
            $property->update(['status' => $data['status']]);

            if ($data['status'] !== $oldStatus) {
                $this->portal->logStatusChange($property, $adminUser, $oldStatus, $data['status'], $data['status_reason'] ?? null);

                if ($property->agent?->user) {
                    $this->notifications->pushNotification(
                        $property->agent->user,
                        'property_status_updated',
                        'Property Status Updated',
                        "Your listing '{$property->title}' was changed from {$oldStatus} to {$data['status']}.",
                        [
                            'property_id' => $property->property_id,
                            'old_status' => $oldStatus,
                            'new_status' => $data['status'],
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
