<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\AgentAvailability;
use App\Models\AgentReview;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Support\ImageUrlResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AgentEcosystemService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    private const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    public function agentsIndex(Request $request): JsonResponse
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

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('agency_name', 'like', "%{$search}%")
                    ->orWhere('bio', 'like', "%{$search}%");
            });
        }

        if ($request->filled('agency_id')) {
            $query->where('agency_id', $request->integer('agency_id'));
        }

        $agents = $query->get();
        $agencies = Agency::query()->withCount('agents')->orderBy('name')->get();

        return response()->json([
            'data' => $agents->map(fn (Agent $agent) => $this->formatAgentCard($agent)),
            'agencies' => $agencies->map(fn (Agency $agency) => $this->formatAgency($agency, true)),
        ]);
    }

    public function agentShow(Request $request, Agent $agent): JsonResponse
    {
        $viewer = $request->user();
        $canViewPrivate = $viewer && ($viewer->isAdmin() || ($viewer->isAgent() && $viewer->agentProfile?->agent_id === $agent->agent_id));

        if (! $canViewPrivate && $agent->approval_status !== 'approved') {
            abort(404);
        }

        $this->ensureAgencyLink($agent);

        $agent->loadMissing([
            'agency',
            'reviews.user',
            'properties.amenities',
            'availabilities',
        ]);

        $activeListings = $agent->properties->where('status', 'Available')->values();
        $soldListings = $agent->properties->where('status', 'Sold')->values();
        $averageRating = round((float) $agent->reviews->avg('rating'), 1);

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
                'availability' => $agent->availabilities
                    ->sortBy(['day_of_week', 'start_time'])
                    ->values()
                    ->map(fn (AgentAvailability $entry) => $this->formatAvailability($entry)),
            ],
        ]);
    }

    public function propertyViewingSlots(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'This property is not accepting viewing reservations right now.'], 422);
        }

        $property->loadMissing('agent.availabilities');
        $agent = $property->agent;

        if (! $agent || ! $agent->isApproved()) {
            return response()->json(['message' => 'This property does not have an approved agent schedule yet.'], 422);
        }

        $date = $request->query('date')
            ? Carbon::parse($request->query('date'))->startOfDay()
            : now()->startOfDay()->addDay();

        if ($date->lt(now()->startOfDay())) {
            return response()->json(['message' => 'Viewing slots can only be requested for today or later.'], 422);
        }

        return response()->json([
            'data' => $this->buildAvailableSlots($property, $date),
            'date' => $date->toDateString(),
        ]);
    }

    public function bookViewing(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'This property is not accepting viewing reservations right now.'], 422);
        }

        $validated = $request->validate([
            'scheduled_start' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $property->loadMissing('agent.user', 'agent.availabilities');
        $agent = $property->agent;

        if (! $agent || ! $agent->isApproved()) {
            return response()->json(['message' => 'This property does not have an approved viewing schedule yet.'], 422);
        }

        $start = Carbon::parse($validated['scheduled_start'])->seconds(0);
        $end = (clone $start)->addMinutes(30);

        $availableSlots = collect($this->buildAvailableSlots($property, $start->copy()->startOfDay()));
        $slotExists = $availableSlots->contains(fn (array $slot) => $slot['start_at'] === $start->toIso8601String());

        if (! $slotExists) {
            return response()->json(['message' => 'That viewing slot is no longer available.'], 422);
        }

        $user = $request->user();
        $booking = ViewingBooking::query()->create([
            'property_id' => $property->property_id,
            'agent_id' => $agent->agent_id,
            'user_id' => $user->id,
            'buyer_name' => $user->full_name,
            'buyer_email' => $user->email,
            'buyer_phone' => $user->phone,
            'notes' => $validated['notes'] ?? null,
            'scheduled_start' => $start,
            'scheduled_end' => $end,
            'status' => 'Pending',
        ]);

        if ($agent->user) {
            $this->notifications->pushNotification(
                $agent->user,
                'booking.new',
                'New property viewing booked',
                $user->full_name.' booked a viewing for '.$property->title.' on '.$start->format('M j, Y g:i A').'.',
                ['property_id' => $property->property_id, 'booking_id' => $booking->booking_id]
            );
        }

        return response()->json([
            'message' => 'Viewing booked successfully.',
            'data' => $this->formatBooking($booking->load(['property.agent.agency', 'user'])),
        ], 201);
    }

    public function agentAvailabilityIndex(Request $request): JsonResponse
    {
        $agent = $request->user()->agentProfile;
        abort_unless($agent, 404, 'No agent profile is linked to this account.');

        $agent->loadMissing('availabilities');

        return response()->json([
            'data' => $agent->availabilities
                ->sortBy(['day_of_week', 'start_time'])
                ->values()
                ->map(fn (AgentAvailability $entry) => $this->formatAvailability($entry)),
        ]);
    }

    public function agentAvailabilityUpdate(Request $request): JsonResponse
    {
        $agent = $request->user()->agentProfile;
        abort_unless($agent, 404, 'No agent profile is linked to this account.');
        abort_if(! $agent->isApproved(), 403, 'Your agent profile is not approved yet.');

        $validated = $request->validate([
            'availability' => ['required', 'array', 'min:1'],
            'availability.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'availability.*.start_time' => ['required', 'date_format:H:i'],
            'availability.*.end_time' => ['required', 'date_format:H:i', 'different:availability.*.start_time'],
            'availability.*.is_active' => ['nullable', 'boolean'],
        ]);

        $agent->availabilities()->delete();

        foreach ($validated['availability'] as $entry) {
            if (Carbon::createFromFormat('H:i', $entry['end_time'])->lessThanOrEqualTo(Carbon::createFromFormat('H:i', $entry['start_time']))) {
                continue;
            }

            $agent->availabilities()->create([
                'day_of_week' => $entry['day_of_week'],
                'start_time' => $entry['start_time'],
                'end_time' => $entry['end_time'],
                'is_active' => $entry['is_active'] ?? true,
            ]);
        }

        $agent->load('availabilities');

        return response()->json([
            'message' => 'Availability schedule updated.',
            'data' => $agent->availabilities
                ->sortBy(['day_of_week', 'start_time'])
                ->values()
                ->map(fn (AgentAvailability $entry) => $this->formatAvailability($entry)),
        ]);
    }

    public function agentViewingsIndex(Request $request): JsonResponse
    {
        $agent = $request->user()->agentProfile;
        abort_unless($agent, 404, 'No agent profile is linked to this account.');
        abort_if(! $agent->isApproved(), 403, 'Your agent profile is not approved yet.');

        $bookings = ViewingBooking::query()
            ->with(['property.agent.agency', 'user'])
            ->where('agent_id', $agent->agent_id)
            ->orderBy('scheduled_start')
            ->get();

        return response()->json([
            'data' => $bookings->map(fn (ViewingBooking $booking) => $this->formatBooking($booking)),
        ]);
    }

    public function agentViewingUpdate(Request $request, ViewingBooking $booking): JsonResponse
    {
        $agent = $request->user()->agentProfile;
        abort_unless($agent, 404, 'No agent profile is linked to this account.');
        abort_if($booking->agent_id !== $agent->agent_id, 403, 'This booking does not belong to the authenticated agent.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(self::BOOKING_STATUSES)],
            'agent_response' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->loadMissing(['property.agent.agency', 'user']);
        
        $booking->status = $validated['status'];
        if (array_key_exists('agent_response', $validated)) {
            $booking->agent_response = $validated['agent_response'];
            $booking->agent_responded_at = now();
        }
        $booking->save();

        if ($booking->user) {
            $this->notifications->pushNotification(
                $booking->user,
                'booking.update',
                'Viewing updated',
                $booking->property->title.' viewing status is now '.$booking->status.'.',
                ['property_id' => $booking->property_id, 'booking_id' => $booking->booking_id]
            );
        }

        return response()->json([
            'message' => 'Viewing booking updated.',
            'data' => $this->formatBooking($booking->fresh()->load(['property.agent.agency', 'user'])),
        ]);
    }

    public function agentReviewStore(Request $request, Agent $agent): JsonResponse
    {
        if ($agent->approval_status !== 'approved') {
            abort(404);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'review_text' => ['nullable', 'string', 'max:1200'],
        ]);

        $user = $request->user();

        if ($user->agentProfile?->agent_id === $agent->agent_id) {
            return response()->json(['message' => 'You cannot review yourself.'], 403);
        }

        $booking = ViewingBooking::query()
            ->where('agent_id', $agent->agent_id)
            ->where('user_id', $user->id)
            ->where('status', '!=', 'Cancelled')
            ->where(function ($builder): void {
                $builder->where('status', 'Completed')
                    ->orWhere('scheduled_end', '<=', now());
            })
            ->latest('scheduled_start')
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'A completed or past viewing is required before leaving a review.'], 422);
        }

        $review = AgentReview::query()->updateOrCreate(
            ['agent_id' => $agent->agent_id, 'user_id' => $user->id],
            [
                'booking_id' => $booking->booking_id,
                'rating' => $validated['rating'],
                'review_text' => $validated['review_text'] ?? null,
            ],
        );

        return response()->json([
            'message' => 'Agent review saved.',
            'data' => $this->formatReview($review->load('user')),
        ]);
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

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildAvailableSlots(Property $property, Carbon $date): array
    {
        $agent = $property->agent;
        $availabilities = $agent->availabilities()
            ->where('day_of_week', $date->dayOfWeek)
            ->where('is_active', true)
            ->orderBy('start_time')
            ->get();

        $blockedStarts = ViewingBooking::query()
            ->where('agent_id', $agent->agent_id)
            ->whereDate('scheduled_start', $date->toDateString())
            ->where('status', '!=', 'Cancelled')
            ->pluck('scheduled_start')
            ->map(fn ($entry) => Carbon::parse($entry)->format('Y-m-d H:i:s'))
            ->all();

        $slots = [];

        foreach ($availabilities as $availability) {
            $cursor = Carbon::parse($date->toDateString().' '.$availability->start_time);
            $end = Carbon::parse($date->toDateString().' '.$availability->end_time);

            while ($cursor->copy()->addMinutes(30)->lessThanOrEqualTo($end)) {
                $slotStart = $cursor->copy();
                $slotEnd = $cursor->copy()->addMinutes(30);

                if ($slotStart->greaterThan(now()) && ! in_array($slotStart->format('Y-m-d H:i:s'), $blockedStarts, true)) {
                    $slots[] = [
                        'start_at' => $slotStart->toIso8601String(),
                        'end_at' => $slotEnd->toIso8601String(),
                        'label' => $slotStart->format('g:i A').' - '.$slotEnd->format('g:i A'),
                    ];
                }

                $cursor->addMinutes(30);
            }
        }

        return $slots;
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

    private function formatAvailability(AgentAvailability $availability): array
    {
        return [
            'id' => $availability->id,
            'day_of_week' => $availability->day_of_week,
            'day_label' => Carbon::now()->startOfWeek(Carbon::SUNDAY)->addDays($availability->day_of_week)->format('l'),
            'start_time' => substr((string) $availability->start_time, 0, 5),
            'end_time' => substr((string) $availability->end_time, 0, 5),
            'is_active' => $availability->is_active,
        ];
    }

    private function formatBooking(ViewingBooking $booking): array
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
}
