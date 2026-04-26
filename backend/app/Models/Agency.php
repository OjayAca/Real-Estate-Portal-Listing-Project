<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agency extends Model
{
    use HasFactory;

    protected $primaryKey = 'agency_id';

    protected $fillable = [
        'name',
        'slug',
        'agency_type',
        'description',
        'website',
        'phone',
        'email',
    ];

    /**
     * @return HasMany<Agent, $this>
     */
    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class, 'agency_id', 'agency_id');
    }
}
