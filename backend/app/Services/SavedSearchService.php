<?php

namespace App\Services;

use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SavedSearchService
{
    private const MAX_SAVED_SEARCHES = 10;

    private const ALLOWED_FILTER_KEYS = [
        'search',
        'property_type',
        'city',
        'min_price',
        'max_price',
        'bedrooms',
        'bathrooms',
        'parking_spaces',
        'amenity_ids',
    ];

    /**
     * List all saved searches for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $searches = $request->user()
            ->savedSearches()
            ->latest()
            ->get()
            ->map(fn (SavedSearch $search) => $this->formatSavedSearch($search));

        return response()->json(['data' => $searches]);
    }

    /**
     * Create a new saved search from the given filter combination.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->savedSearches()->count() >= self::MAX_SAVED_SEARCHES) {
            return response()->json([
                'message' => 'You can save up to '.self::MAX_SAVED_SEARCHES.' searches. Remove an existing one first.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'filters' => ['required', 'array'],
            'listing_purpose' => ['required', Rule::in(['sale', 'rent'])],
            'notify_email' => ['sometimes', 'boolean'],
        ]);

        $sanitizedFilters = $this->sanitizeFilters($validated['filters']);

        if (empty($sanitizedFilters)) {
            return response()->json([
                'message' => 'At least one filter must be set to save a search.',
            ], 422);
        }

        $search = $user->savedSearches()->create([
            'name' => $validated['name'],
            'filters' => $sanitizedFilters,
            'listing_purpose' => $validated['listing_purpose'],
            'notify_email' => $validated['notify_email'] ?? false,
        ]);

        return response()->json([
            'message' => 'Search saved.',
            'data' => $this->formatSavedSearch($search),
        ], 201);
    }

    /**
     * Update an existing saved search (rename, toggle alerts).
     */
    public function update(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        $this->guardOwnership($request, $savedSearch);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'notify_email' => ['sometimes', 'boolean'],
        ]);

        $savedSearch->update($validated);

        return response()->json([
            'message' => 'Saved search updated.',
            'data' => $this->formatSavedSearch($savedSearch->fresh()),
        ]);
    }

    /**
     * Toggle email alerts for a saved search.
     */
    public function toggleAlert(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        $this->guardOwnership($request, $savedSearch);

        $savedSearch->update([
            'notify_email' => ! $savedSearch->notify_email,
        ]);

        return response()->json([
            'message' => $savedSearch->notify_email ? 'Alerts enabled.' : 'Alerts disabled.',
            'notify_email' => $savedSearch->notify_email,
        ]);
    }

    /**
     * Delete a saved search.
     */
    public function destroy(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        $this->guardOwnership($request, $savedSearch);

        $savedSearch->delete();

        return response()->json(['message' => 'Saved search deleted.']);
    }

    /**
     * Guard that the authenticated user owns the given saved search.
     */
    private function guardOwnership(Request $request, SavedSearch $savedSearch): void
    {
        if ($savedSearch->user_id !== $request->user()->id) {
            abort(403, 'This saved search does not belong to you.');
        }
    }

    /**
     * Strip unknown filter keys and empty values.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function sanitizeFilters(array $filters): array
    {
        $clean = [];

        foreach (self::ALLOWED_FILTER_KEYS as $key) {
            $value = $filters[$key] ?? null;

            if (is_array($value)) {
                $value = array_filter($value);
                if (! empty($value)) {
                    $clean[$key] = $value;
                }
            } elseif ($value !== null && trim((string) $value) !== '') {
                $clean[$key] = trim((string) $value);
            }
        }

        return $clean;
    }

    /**
     * Format a saved search for JSON responses.
     *
     * @return array<string, mixed>
     */
    private function formatSavedSearch(SavedSearch $search): array
    {
        return [
            'id' => $search->id,
            'name' => $search->name,
            'filters' => $search->filters,
            'listing_purpose' => $search->listing_purpose,
            'notify_email' => $search->notify_email,
            'last_notified_at' => optional($search->last_notified_at)?->toIso8601String(),
            'created_at' => optional($search->created_at)?->toIso8601String(),
        ];
    }
}
