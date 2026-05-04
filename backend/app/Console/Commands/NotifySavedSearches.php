<?php

namespace App\Console\Commands;

use App\Mail\NewMatchingPropertiesMail;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Support\ImageUrlResolver;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Mail;

class NotifySavedSearches extends Command
{
    /**
     * @var string
     */
    protected $signature = 'search:notify';

    /**
     * @var string
     */
    protected $description = 'Send email alerts for saved searches that have new matching properties.';

    public function handle(): int
    {
        $searches = SavedSearch::withAlerts()
            ->with('user')
            ->get();

        if ($searches->isEmpty()) {
            $this->info('No saved searches with alerts enabled.');

            return self::SUCCESS;
        }

        $sent = 0;

        foreach ($searches as $search) {
            $newProperties = $this->findNewMatches($search);

            if ($newProperties->isEmpty()) {
                continue;
            }

            $formatted = $newProperties->map(function (Property $property): array {
                return [
                    'title' => $property->title,
                    'city' => $property->city,
                    'state' => $property->province,
                    'price' => $property->price,
                    'bedrooms' => $property->bedrooms,
                    'bathrooms' => $property->bathrooms,
                    'featured_image' => $property->featured_image
                        ? ImageUrlResolver::resolve($property->featured_image)
                        : null,
                ];
            });

            $purpose = $search->listing_purpose === 'rent' ? 'rent' : 'buy';
            $frontendUrl = config('app.frontend_url', 'http://localhost:5173') . "/{$purpose}?" . http_build_query($search->filters);

            Mail::to($search->user->email)->send(
                new NewMatchingPropertiesMail($search->name, $formatted, $frontendUrl)
            );

            $search->update(['last_notified_at' => now()]);
            $sent++;
        }

        $this->info("Sent {$sent} saved search alert(s).");

        return self::SUCCESS;
    }

    /**
     * Build and execute the property query using the saved filter set,
     * scoped to listings created since the last notification (or 24 hours).
     *
     * @return \Illuminate\Support\Collection<int, Property>
     */
    private function findNewMatches(SavedSearch $search): \Illuminate\Support\Collection
    {
        $since = $search->last_notified_at ?? now()->subDay();
        $filters = $search->filters;

        $query = Property::query()
            ->where('status', 'Available')
            ->where('listing_purpose', $search->listing_purpose)
            ->where('created_at', '>', $since);

        if ($value = ($filters['search'] ?? null)) {
            $terms = array_filter(explode(' ', (string) $value));

            $query->where(function (Builder $builder) use ($terms): void {
                foreach ($terms as $term) {
                    $builder->where(function (Builder $termBuilder) use ($term): void {
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

        if ($value = ($filters['property_type'] ?? null)) {
            $query->where('property_type', $value);
        }

        if ($value = ($filters['city'] ?? null)) {
            $query->where(function (Builder $builder) use ($value): void {
                $builder->where('city', 'like', "%{$value}%")
                    ->orWhere('province', 'like', "%{$value}%");
            });
        }

        if ($value = ($filters['min_price'] ?? null)) {
            $query->where('price', '>=', $this->sanitizeNumeric($value, true));
        }

        if ($value = ($filters['max_price'] ?? null)) {
            $query->where('price', '<=', $this->sanitizeNumeric($value, true));
        }

        if ($value = ($filters['bedrooms'] ?? null)) {
            $query->where('bedrooms', '>=', $this->sanitizeNumeric($value));
        }

        if ($value = ($filters['bathrooms'] ?? null)) {
            $query->where('bathrooms', '>=', $this->sanitizeNumeric($value));
        }

        if ($value = ($filters['parking_spaces'] ?? null)) {
            $query->where('parking_spaces', '>=', $this->sanitizeNumeric($value));
        }

        if ($ids = ($filters['amenity_ids'] ?? null)) {
            $ids = is_array($ids) ? $ids : explode(',', (string) $ids);
        } else {
            $ids = [];
        }

        if ($legacyId = ($filters['amenity_id'] ?? null)) {
            $ids[] = $legacyId;
        }

        if (!empty($ids)) {
            $ids = array_filter(array_unique(array_map('intval', $ids)));

            foreach ($ids as $id) {
                $query->whereHas('amenities', fn (Builder $builder) => $builder->where('property_amenities.amenity_id', $id));
            }
        }

        return $query->orderByDesc('created_at')->limit(20)->get();
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
