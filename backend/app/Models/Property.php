<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasFactory;

    protected $primaryKey = 'property_id';

    protected $fillable = [
        'agent_id',
        'title',
        'slug',
        'description',
        'property_type',
        'listing_purpose',
        'price',
        'bedrooms',
        'bathrooms',
        'parking_spaces',
        'area_sqm',
        'address_line',
        'city',
        'province',
        'featured_image',
        'status',
        'listed_at',
        'views_count',
    ];

    protected function casts(): array
    {
        return [
            'listed_at' => 'datetime',
            'price' => 'decimal:2',
            'views_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Agent, $this>
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'agent_id', 'agent_id');
    }

    /**
     * @return BelongsToMany<Amenity, $this>
     */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'property_amenities', 'property_id', 'amenity_id');
    }

    /**
     * @return HasMany<PropertyStatusLog, $this>
     */
    public function statusLogs(): HasMany
    {
        return $this->hasMany(PropertyStatusLog::class, 'property_id', 'property_id');
    }
}
