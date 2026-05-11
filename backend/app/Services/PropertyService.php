<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Property;
use App\Support\ImageUrlResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class PropertyService
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];

    private const LISTING_PURPOSES = ['sale', 'rent'];

    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive', 'Pending Sold', 'Pending Rented', 'Pending Review', 'Reserved'];

    private const AGENT_CREATE_STATUSES = ['Draft', 'Pending Review'];

    private const AGENT_ALLOWED_STATUSES = ['Draft', 'Available', 'Pending Sold', 'Pending Rented', 'Inactive', 'Pending Review', 'Reserved'];

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

    public function propertiesIndex(array $filters, ?\App\Models\User $user = null): JsonResponse
    {
        $query = Property::query()
            ->with(['agent.user', 'amenities'])
            ->orderByDesc('listed_at')
            ->orderByDesc('created_at');

        $requestedStatus = $filters['status'] ?? null;

        if ($requestedStatus && $user && ($user->isAdmin() || $user->isAgent())) {
            $query->where('status', $requestedStatus);
        } else {
            $query->where('status', 'Available');
        }

        if ($search = ($filters['search'] ?? null)) {
            $terms = array_filter(explode(' ', (string) $search));

            $query->where(function ($builder) use ($terms): void {
                foreach ($terms as $term) {
                    $builder->where(function ($termBuilder) use ($term): void {
                        $termBuilder->where('title', 'like', "%{$term}%")
                            ->orWhere('description', 'like', "%{$term}%")
                            ->orWhere('property_type', 'like', "%{$term}%")
                            ->orWhere('city', 'like', "%{$term}%")
                            ->orWhere('province', 'like', "%{$term}%")
                            ->orWhere('address_line', 'like', "%{$term}%");
                    });
                }
            });
        }

        if ($type = ($filters['property_type'] ?? null)) {
            $query->where('property_type', $type);
        }

        if ($purpose = ($filters['listing_purpose'] ?? null)) {
            $query->where('listing_purpose', $purpose);
        }

        if ($city = ($filters['city'] ?? null)) {
            $query->where(function ($builder) use ($city): void {
                $builder->where('city', 'like', "%{$city}%")
                    ->orWhere('province', 'like', "%{$city}%");
            });
        }

        if ($province = ($filters['province'] ?? null)) {
            $query->where('province', 'like', "%{$province}%");
        }

        if (filled($filters['min_price'] ?? null)) {
            $query->where('price', '>=', $this->sanitizeNumeric($filters['min_price'], true));
        }

        if (filled($filters['max_price'] ?? null)) {
            $query->where('price', '<=', $this->sanitizeNumeric($filters['max_price'], true));
        }

        if (filled($filters['bedrooms'] ?? null)) {
            $query->where('bedrooms', '>=', $this->sanitizeNumeric($filters['bedrooms']));
        }

        if (filled($filters['bathrooms'] ?? null)) {
            $query->where('bathrooms', '>=', $this->sanitizeNumeric($filters['bathrooms']));
        }

        if (filled($filters['parking_spaces'] ?? null)) {
            $query->where('parking_spaces', '>=', $this->sanitizeNumeric($filters['parking_spaces']));
        }

        if (filled($filters['amenity_ids'] ?? null) || filled($filters['amenity_id'] ?? null)) {
            $ids = is_array($filters['amenity_ids'] ?? null)
                ? $filters['amenity_ids']
                : explode(',', (string) ($filters['amenity_ids'] ?? ''));

            if (filled($filters['amenity_id'] ?? null)) {
                $ids[] = $filters['amenity_id'];
            }

            $ids = array_filter(array_unique(array_map('intval', $ids)));

            foreach ($ids as $id) {
                $query->whereHas('amenities', fn ($builder) => $builder->where('property_amenities.amenity_id', $id));
            }
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 9), self::MAX_PER_PAGE));
        $properties = $query->paginate($perPage)->withQueryString();

        return response()->json($this->paginatedPropertiesResponse($properties));
    }

    public function propertyShow(Property $property, ?\App\Models\User $user = null): JsonResponse
    {
        $property->loadMissing(['agent.user', 'amenities']);

        $canViewPrivate = $user && ($user->isAdmin() || ($user->isAgent() && $user->agent?->agent_id === $property->agent_id));

        if (! $canViewPrivate && $property->status !== 'Available') {
            abort(404);
        }

        if (! $canViewPrivate) {
            $property->increment('views_count');
            $property->refresh();
        }

        return response()->json([
            'data' => $this->portal->formatProperty($property),
            'similar_properties' => $this->getSimilarProperties($property),
        ]);
    }

    private function getSimilarProperties(Property $property): array
    {
        $query = Property::query()
            ->with(['agent.user', 'amenities'])
            ->where('property_id', '!=', $property->property_id)
            ->where('status', 'Available')
            ->where('listing_purpose', $property->listing_purpose);

        // Try to match type first
        $baseQuery = (clone $query)->where('property_type', $property->property_type);

        // Try to match city and price range +/- 30%
        $minPrice = $property->price * 0.7;
        $maxPrice = $property->price * 1.3;

        $cityAndPriceMatch = (clone $baseQuery)
            ->where('city', $property->city)
            ->whereBetween('price', [$minPrice, $maxPrice]);

        $results = $cityAndPriceMatch->latest()->take(4)->get();

        if ($results->count() < 4) {
            // Fill with same type from anywhere if not enough in same city/price
            $remaining = 4 - $results->count();
            $others = $baseQuery->whereNotIn('property_id', $results->pluck('property_id'))
                ->latest()
                ->take($remaining)
                ->get();
            $results = $results->concat($others);
        }

        if ($results->count() < 4) {
            // Last resort: any available property with same purpose
            $remaining = 4 - $results->count();
            $others = $query->whereNotIn('property_id', $results->pluck('property_id'))
                ->latest()
                ->take($remaining)
                ->get();
            $results = $results->concat($others);
        }

        return $results->map(fn(Property $p) => $this->portal->formatProperty($p))->toArray();
    }

    public function agentPropertiesIndex(\App\Models\User $user): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($user);
        $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->get();

        return response()->json([
            'data' => $properties->map(fn (Property $property) => $this->portal->formatProperty($property)),
        ]);
    }

    public function agentPropertyStore(array $data, \App\Models\User $user, ?\Illuminate\Http\UploadedFile $imageFile = null): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($user);
        
        if ($imageFile) {
            $data['featured_image'] = $this->images->storeFeaturedImage($imageFile, $agent);
        }

        $amenityIds = $data['amenity_ids'] ?? [];
        unset($data['amenity_ids']);

        $data['agent_id'] = $agent->agent_id;
        $data['slug'] = $this->generateSlug($data['title']);
        $data['listing_purpose'] ??= 'sale';
        $data['listed_at'] = ($data['status'] ?? 'Available') === 'Available' ? now() : null;

        $property = Property::query()->create($data);
        $property->amenities()->sync($amenityIds);

        return response()->json([
            'message' => 'Property listing created.',
            'data' => $this->portal->formatProperty($property->load(['agent.user', 'amenities'])),
        ], 201);
    }

    public function agentPropertyUpdate(array $data, Property $property, \App\Models\User $user, ?\Illuminate\Http\UploadedFile $imageFile = null): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($user);
        $this->portal->guardOwnProperty($agent, $property);

        if ($imageFile) {
            $data['featured_image'] = $this->images->storeFeaturedImage($imageFile, $agent, $property);
        }

        if (array_key_exists('title', $data)) {
            $data['slug'] = $this->generateSlug($data['title'], $property);
        }

        if (($data['status'] ?? null) === 'Available' && ! $property->listed_at) {
            $data['listed_at'] = now();
        }

        $amenityIds = $data['amenity_ids'] ?? null;
        unset($data['amenity_ids']);

        DB::transaction(function () use ($amenityIds, $data, $property, $user): void {
            $oldStatus = $property->status;
            $property->update($data);

            if ($amenityIds !== null) {
                $property->amenities()->sync($amenityIds);
            }

            if (isset($data['status']) && $data['status'] !== $oldStatus) {
                $this->portal->logStatusChange($property, $user, $oldStatus, $data['status'], $data['status_reason'] ?? null);
            }
        });

        return response()->json([
            'message' => 'Property listing updated.',
            'data' => $this->portal->formatProperty($property->fresh()->load(['agent.user', 'amenities'])),
        ]);
    }

    public function agentPropertyDestroy(Property $property, \App\Models\User $user): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($user);
        $this->portal->guardOwnProperty($agent, $property);

        if (ImageUrlResolver::isManaged($property->featured_image)) {
            Storage::delete($property->featured_image);
        }

        $property->delete();

        return response()->json(['message' => 'Property listing deleted.']);
    }

    public function savedPropertiesIndex(\App\Models\User $user, array $params = []): JsonResponse
    {
        $perPage = max(1, min((int) ($params['per_page'] ?? 12), self::MAX_PER_PAGE));

        $properties = $user
            ->savedProperties()
            ->with(['agent.user', 'amenities'])
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($this->paginatedPropertiesResponse($properties));
    }

    public function saveProperty(\App\Models\User $user, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'Only available properties can be saved.'], 422);
        }

        $user->savedProperties()->syncWithoutDetaching([$property->property_id]);

        return response()->json(['message' => 'Property saved.']);
    }

    public function unsaveProperty(\App\Models\User $user, Property $property): JsonResponse
    {
        $user->savedProperties()->detach($property->property_id);

        return response()->json(['message' => 'Property removed from saved listings.']);
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

    /**
     * Clean numeric input (remove commas/spaces) and return correct type.
     */
    private function sanitizeNumeric(mixed $value, bool $isFloat = false): float|int
    {
        if (is_numeric($value)) {
            return $isFloat ? (float) $value : (int) $value;
        }

        $clean = preg_replace('/[^0-9.]/', '', (string) $value);

        return $isFloat ? (float) $clean : (int) $clean;
    }
}
