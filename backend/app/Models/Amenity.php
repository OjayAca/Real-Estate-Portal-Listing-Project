<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Amenity extends Model
{
    use HasFactory;

    protected $primaryKey = 'amenity_id';

    protected $fillable = [
        'amenity_name',
        'amenity_category',
    ];

    /**
     * @return BelongsToMany<Property, $this>
     */
    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'property_amenities', 'amenity_id', 'property_id');
    }
}
