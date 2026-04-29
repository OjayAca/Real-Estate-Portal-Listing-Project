<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inquiry extends Model
{
    use HasFactory;

    protected $primaryKey = 'inquiry_id';

    protected $fillable = [
        'property_id',
        'user_id',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'message',
        'status',
        'response_message',
        'responded_at',
        'buyer_reply',
        'buyer_replied_at',
    ];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
            'buyer_replied_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id', 'property_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
