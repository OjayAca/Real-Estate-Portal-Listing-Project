<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedSearch extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'filters',
        'listing_purpose',
        'notify_email',
        'last_notified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'notify_email' => 'boolean',
            'last_notified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to saved searches that have email alerts enabled.
     *
     * @param  Builder<SavedSearch>  $query
     * @return Builder<SavedSearch>
     */
    public function scopeWithAlerts(Builder $query): Builder
    {
        return $query->where('notify_email', true);
    }
}
