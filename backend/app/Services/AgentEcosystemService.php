<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\AgentReview;
use App\Models\BuyerAgentInteraction;
use App\Models\Property;
use App\Support\ImageUrlResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentEcosystemService
{
    public function __construct(
        private readonly InquiryService $inquiryService,
        private readonly NotificationService $notifications,
    ) {}

    public function agentsIndex(?string $search = null): JsonResponse
    {
        $this->syncNamedAgencies();

        $query = Agent::query()
            ->where('approval_status', 'approved')
            ->with(['agency', 'properties' => fn ($builder) => $builder->latest()->take(3)])
            ->withCount([
                'properties as active_listings_count' => fn ($builder) => $builder->where('status', 'Available'),
                'properties as sold_listings_count' => fn ($builder) => $builder->where('status', 'Sold'),
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->orderByDesc('reviews_avg_rating')
            ->orderBy('last_name');

        if ($search = trim((string) $search)) {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('agency_name', 'like', "%{$search}%")
                    ->orWhere('bio', 'like', "%{$search}%")
                    ->orWhereHas('properties', function ($q) use ($search) {
                        $q->where('city', 'like', "%{$search}%")
                            ->orWhere('province', 'like', "%{$search}%")
                            ->orWhere('address_line', 'like', "%{$search}%");
                    });
            });
        }

        $agents = $query->get();

        return response()->json([
            'data' => $agents->map(fn (Agent $agent) => $this->formatAgentCard($agent)),
        ]);
    }

    public function agentShow(Agent $agent, ?\App\Models\User $viewer = null): JsonResponse
    {
        $canViewPrivate = $viewer && ($viewer->isAdmin() || ($viewer->isAgent() && $viewer->agent?->agent_id === $agent->agent_id));

        if (! $canViewPrivate && $agent->approval_status !== 'approved') {
            abort(404);
        }

        $this->ensureAgencyLink($agent);

        $agent->loadMissing([
            'agency',
            'reviews.user',
            'properties.amenities',
        ]);

        $activeListings = $agent->properties->where('status', 'Available')->values();
        $soldListings = $agent->properties->where('status', 'Sold')->values();
        $averageRating = round((float) $agent->reviews->avg('rating'), 1);

        $canReview = false;
        if ($viewer && $viewer->isBuyer()) {
            $canReview = $viewer->hasInteractedWith($agent->agent_id);
        }

        return response()->json([
            'data' => [
                'agent' => $this->formatAgentProfile($agent, $averageRating, $activeListings->count(), $soldListings->count()),
                'active_listings' => $activeListings->map(fn (Property $property) => $this->formatPropertySummary($property)),
                'sold_listings' => $soldListings->map(fn (Property $property) => $this->formatPropertySummary($property)),
                'reviews' => $agent->reviews
                    ->sortByDesc('created_at')
                    ->take(8)
                    ->values()
                    ->map(fn (AgentReview $review) => $this->formatReview($review)),
                'can_review' => $canReview,
            ],
        ]);
    }

    public function agentReviewStore(array $data, Agent $agent, \App\Models\User $user): JsonResponse
    {
        if ($agent->approval_status !== 'approved') {
            abort(404);
        }

        if ($user->agent?->agent_id === $agent->agent_id) {
            return response()->json(['message' => 'You cannot review yourself.'], 403);
        }

        if ($user->isBuyer() && ! $user->hasInteractedWith($agent->agent_id)) {
            return response()->json([
                'message' => 'You can only review agents you\'ve previously contacted or requested a viewing with.',
            ], 403);
        }

        $review = AgentReview::query()->updateOrCreate(
            ['agent_id' => $agent->agent_id, 'user_id' => $user->id],
            [
                'rating' => $data['rating'],
                'review_text' => $data['review_text'] ?? null,
            ],
        );

        $agent->loadMissing('user');
        if ($agent->user) {
            $this->notifications->pushNotification(
                $agent->user,
                'agent_review_received',
                'New Review Received',
                "{$user->full_name} left you a {$data['rating']}-star review.",
                [
                    'agent_id' => $agent->agent_id,
                    'review_id' => $review->review_id,
                    'rating' => $data['rating'],
                    'action_url' => "/agents/{$agent->agent_id}",
                ],
            );
        }

        return response()->json([
            'message' => 'Agent review saved.',
            'data' => $this->formatReview($review->load('user')),
        ]);
    }

    public function createAgentInquiry(array $data, Agent $agent, \App\Models\User $user): JsonResponse
    {
        return $this->inquiryService->createAgentInquiry($data, $agent, $user);
    }

    private function syncNamedAgencies(): void
    {
        $hasStale = Agent::query()
            ->whereNull('agency_id')
            ->whereNotNull('agency_name')
            ->where('agency_name', '!=', '')
            ->exists();

        if (! $hasStale) {
            return;
        }

        Agent::query()
            ->whereNull('agency_id')
            ->whereNotNull('agency_name')
            ->where('agency_name', '!=', '')
            ->get()
            ->each(fn (Agent $agent) => $this->ensureAgencyLink($agent));
    }

    private function ensureAgencyLink(Agent $agent): void
    {
        if ($agent->agency_id || ! $agent->agency_name) {
            return;
        }

        $agency = Agency::query()->firstOrCreate(
            ['name' => $agent->agency_name],
            [
                'slug' => $this->generateAgencySlug($agent->agency_name),
                'agency_type' => 'Agency',
            ],
        );

        $agent->update(['agency_id' => $agency->agency_id]);
        $agent->setRelation('agency', $agency);
    }

    private function generateAgencySlug(string $name): string
    {
        $slug = Str::slug($name);
        $candidate = $slug;
        $counter = 1;

        while (Agency::query()->where('slug', $candidate)->exists()) {
            $candidate = $slug.'-'.$counter;
            $counter++;
        }

        return $candidate;
    }

    private function formatAgency(Agency $agency, bool $withCounts = false): array
    {
        return [
            'agency_id' => $agency->agency_id,
            'name' => $agency->name,
            'slug' => $agency->slug,
            'agency_type' => $agency->agency_type,
            'description' => $agency->description,
            'website' => $agency->website,
            'phone' => $agency->phone,
            'email' => $agency->email,
            'agents_count' => $withCounts ? ($agency->agents_count ?? 0) : null,
        ];
    }

    private function formatAgentCard(Agent $agent): array
    {
        return [
            'agent_id' => $agent->agent_id,
            'full_name' => $agent->full_name,
            'bio' => $agent->bio,
            'profile_picture' => ImageUrlResolver::resolve($agent->profile_picture),
            'agency_name' => $agent->agency_name,
            'agency' => $agent->relationLoaded('agency') && $agent->agency ? $this->formatAgency($agent->agency) : null,
            'active_listings_count' => $agent->active_listings_count ?? 0,
            'sold_listings_count' => $agent->sold_listings_count ?? 0,
            'reviews_count' => $agent->reviews_count ?? 0,
            'average_rating' => round((float) ($agent->reviews_avg_rating ?? 0), 1),
            'featured_properties' => $agent->relationLoaded('properties')
                ? $agent->properties->map(fn (Property $property) => $this->formatPropertySummary($property))->values()
                : [],
        ];
    }

    private function formatAgentProfile(Agent $agent, float $averageRating, int $activeCount, int $soldCount): array
    {
        return [
            'agent_id' => $agent->agent_id,
            'full_name' => $agent->full_name,
            'email' => $agent->email,
            'phone' => $agent->phone,
            'license_number' => $agent->license_number,
            'dhsud_registration_number' => $agent->dhsud_registration_number,
            'profile_picture' => ImageUrlResolver::resolve($agent->profile_picture),
            'bio' => $agent->bio,
            'agency_name' => $agent->agency_name,
            'agency' => $agent->relationLoaded('agency') && $agent->agency ? $this->formatAgency($agent->agency) : null,
            'approval_status' => $agent->approval_status,
            'average_rating' => $averageRating,
            'reviews_count' => $agent->reviews->count(),
            'active_listings_count' => $activeCount,
            'sold_listings_count' => $soldCount,
        ];
    }

    private function formatPropertySummary(Property $property): array
    {
        return [
            'property_id' => $property->property_id,
            'title' => $property->title,
            'city' => $property->city,
            'province' => $property->province,
            'status' => $property->status,
            'price' => (float) $property->price,
            'featured_image' => ImageUrlResolver::resolve($property->featured_image),
            'property_type' => $property->property_type,
        ];
    }

    private function formatReview(AgentReview $review): array
    {
        return [
            'review_id' => $review->review_id,
            'rating' => $review->rating,
            'review_text' => $review->review_text,
            'created_at' => optional($review->created_at)->toIso8601String(),
            'user' => $review->relationLoaded('user') && $review->user ? [
                'id' => $review->user->id,
                'full_name' => $review->user->full_name,
            ] : null,
        ];
    }
}
