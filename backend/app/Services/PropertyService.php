<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\User;
use App\Support\ImageUrlResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class PropertyService
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
    private const LISTING_PURPOSES = ['sale', 'rent'];
    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive'];
    private const AGENT_ALLOWED_STATUSES = ['Draft', 'Available', 'Sold', 'Rented'];
    private const FEATURED_IMAGE_MAX_SIZE_KB = 25600;
    private const FEATURED_IMAGE_MIN_WIDTH = 1200;
    private const FEATURED_IMAGE_MIN_HEIGHT = 675;
    private const FEATURED_IMAGE_MAX_WIDTH = 4000;
    private const FEATURED_IMAGE_MAX_HEIGHT = 4000;
    private const MAX_PER_PAGE = 24;

    public function __construct(
        private readonly ImageService $images,
        private readonly PortalService $portal,
    ) {}

    public function propertiesIndex(Request $request): JsonResponse
    {
        $query = Property::query()
            ->with(['agent.user', 'amenities'])
            ->orderByDesc('listed_at')
            ->orderByDesc('created_at');

        $user = $request->user();
        $requestedStatus = $request->query('status');

        if ($requestedStatus && $user && ($user->isAdmin() || $user->isAgent())) {
            $query->where('status', $requestedStatus);
        } else {
            $query->where('status', 'Available');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%")
                    ->orWhere('address_line', 'like', "%{$search}%");
            });
        }

        if ($type = $request->query('property_type')) {
            $query->where('property_type', $type);
        }

        if ($purpose = $request->query('listing_purpose')) {
            $query->where('listing_purpose', $purpose);
        }

        if ($city = $request->query('city')) {
            $query->where('city', 'like', "%{$city}%");
        }

        if ($province = $request->query('province')) {
            $query->where('province', 'like', "%{$province}%");
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        if ($request->filled('bedrooms')) {
            $query->where('bedrooms', '>=', (int) $request->query('bedrooms'));
        }

        if ($request->filled('bathrooms')) {
            $query->where('bathrooms', '>=', (int) $request->query('bathrooms'));
        }

        if ($request->filled('parking_spaces')) {
            $query->where('parking_spaces', '>=', (int) $request->query('parking_spaces'));
        }

        if ($request->filled('amenity_id')) {
            $query->whereHas('amenities', fn ($builder) => $builder->where('amenity_id', $request->integer('amenity_id')));
        }

        $perPage = max(1, min($request->integer('per_page', 9), self::MAX_PER_PAGE));
        $properties = $query->paginate($perPage)->withQueryString();

        return response()->json($this->paginatedPropertiesResponse($properties));
    }

    public function propertyShow(Request $request, Property $property): JsonResponse
    {
        $property->loadMissing(['agent.user', 'amenities']);
        $user = $request->user();

        $canViewPrivate = $user && ($user->isAdmin() || ($user->isAgent() && $user->agentProfile?->agent_id === $property->agent_id));

        if (! $canViewPrivate && $property->status !== 'Available') {
            abort(404);
        }

        return response()->json([
            'data' => $this->portal->formatProperty($property),
        ]);
    }

    public function agentPropertiesIndex(Request $request): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->get();

        return response()->json([
            'data' => $properties->map(fn (Property $property) => $this->portal->formatProperty($property)),
        ]);
    }

    public function agentPropertyStore(Request $request): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        [$payload, $amenityIds] = $this->validatePropertyPayload($request, $agent, false, null, self::AGENT_ALLOWED_STATUSES);
        $payload['agent_id'] = $agent->agent_id;
        $payload['slug'] = $this->generateSlug($payload['title']);
        $payload['listing_purpose'] ??= 'sale';
        $payload['listed_at'] = ($payload['status'] ?? 'Available') === 'Available' ? now() : null;

        $property = Property::query()->create($payload);
        $property->amenities()->sync($amenityIds);

        return response()->json([
            'message' => 'Property listing created.',
            'data' => $this->portal->formatProperty($property->load(['agent.user', 'amenities'])),
        ], 201);
    }

    public function agentPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        $this->portal->guardOwnProperty($agent, $property);

        $allowedStatuses = self::AGENT_ALLOWED_STATUSES;
        if ($property->status !== 'Draft') {
            $allowedStatuses = array_values(array_diff($allowedStatuses, ['Draft']));
        }

        [$payload, $amenityIds] = $this->validatePropertyPayload($request, $agent, true, $property, $allowedStatuses);

        if (array_key_exists('title', $payload)) {
            $payload['slug'] = $this->generateSlug($payload['title'], $property);
        }

        if (($payload['status'] ?? null) === 'Available' && ! $property->listed_at) {
            $payload['listed_at'] = now();
        }

        $property->update($payload);
        if ($amenityIds !== null) {
            $property->amenities()->sync($amenityIds);
        }

        return response()->json([
            'message' => 'Property listing updated.',
            'data' => $this->portal->formatProperty($property->fresh()->load(['agent.user', 'amenities'])),
        ]);
    }

    public function agentPropertyDestroy(Request $request, Property $property): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        $this->portal->guardOwnProperty($agent, $property);

        if (ImageUrlResolver::isManaged($property->featured_image)) {
            Storage::disk('public')->delete($property->featured_image);
        }

        $property->delete();

        return response()->json(['message' => 'Property listing deleted.']);
    }

    public function savedPropertiesIndex(Request $request): JsonResponse
    {
        $properties = $request->user()->savedProperties()->with(['agent.user', 'amenities'])->latest()->get();

        return response()->json([
            'data' => $properties->map(fn (Property $property) => $this->portal->formatProperty($property)),
        ]);
    }

    public function saveProperty(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'Only available properties can be saved.'], 422);
        }

        $request->user()->savedProperties()->syncWithoutDetaching([$property->property_id]);

        return response()->json(['message' => 'Property saved.']);
    }

    public function unsaveProperty(Request $request, Property $property): JsonResponse
    {
        $request->user()->savedProperties()->detach($property->property_id);

        return response()->json(['message' => 'Property removed from saved listings.']);
    }

    /**
     * @param  array<string>|null  $allowedStatuses
     * @return array{0: array<string, mixed>, 1: array<int>|null}
     */
    private function validatePropertyPayload(Request $request, Agent $agent, bool $isUpdate = false, ?Property $property = null, ?array $allowedStatuses = null): array
    {
        $required = $isUpdate ? ['sometimes'] : ['required'];
        $allowedStatuses ??= self::PROPERTY_STATUSES;

        $validated = $request->validate([
            'title' => array_merge($required, ['string', 'max:150']),
            'description' => array_merge($required, ['string']),
            'property_type' => array_merge($required, [Rule::in(self::PROPERTY_TYPES)]),
            'listing_purpose' => ['sometimes', Rule::in(self::LISTING_PURPOSES)],
            'price' => array_merge($required, ['numeric', 'min:1']),
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'parking_spaces' => ['nullable', 'integer', 'min:0', 'max:20'],
            'area_sqm' => ['nullable', 'integer', 'min:0'],
            'address_line' => array_merge($required, ['string', 'max:255']),
            'city' => array_merge($required, ['string', 'max:100']),
            'province' => array_merge($required, ['string', 'max:100']),
            'featured_image' => ['nullable', 'string', 'max:255'],
            'featured_image_upload' => [
                'nullable',
                'file',
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(self::FEATURED_IMAGE_MAX_SIZE_KB),
                Rule::dimensions()
                    ->minWidth(self::FEATURED_IMAGE_MIN_WIDTH)
                    ->minHeight(self::FEATURED_IMAGE_MIN_HEIGHT)
                    ->maxWidth(self::FEATURED_IMAGE_MAX_WIDTH)
                    ->maxHeight(self::FEATURED_IMAGE_MAX_HEIGHT),
            ],
            'status' => ['nullable', Rule::in($allowedStatuses)],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,amenity_id'],
        ]);

        if ($request->hasFile('featured_image_upload')) {
            $validated['featured_image'] = $this->images->storeFeaturedImage($request->file('featured_image_upload'), $agent, $property);
        }

        $amenityIds = $validated['amenity_ids'] ?? ($isUpdate ? null : []);
        unset($validated['amenity_ids']);
        unset($validated['featured_image_upload']);

        return [$validated, $amenityIds];
    }

    private function generateSlug(string $title, ?Property $existing = null): string
    {
        $slug = Str::slug($title);
        $candidate = $slug;
        $counter = 1;

        while (Property::query()
            ->where('slug', $candidate)
            ->when($existing, fn ($builder) => $builder->where('property_id', '!=', $existing->property_id))
            ->exists()) {
            $candidate = $slug.'-'.$counter;
            $counter++;
        }

        return $candidate;
    }

    private function paginatedPropertiesResponse(LengthAwarePaginator $properties): array
    {
        return [
            'data' => collect($properties->items())->map(fn (Property $property) => $this->portal->formatProperty($property))->values(),
            'meta' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ],
        ];
    }
}
