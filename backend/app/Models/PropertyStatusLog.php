<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyStatusLog extends Model
{
    protected $primaryKey = 'status_log_id';

    protected $fillable = [
        'property_id',
        'user_id',
        'old_status',
        'new_status',
        'reason',
    ];

    /**
     * Get the property associated with the log.
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id', 'property_id');
    }

    /**
     * Get the user who performed the status change.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
