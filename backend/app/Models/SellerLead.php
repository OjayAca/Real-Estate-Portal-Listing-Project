<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerLead extends Model
{
    use HasFactory;

    protected $primaryKey = 'seller_lead_id';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'property_type',
        'property_address',
        'bedrooms',
        'bathrooms',
        'home_size',
        'lot_size',
        'condition_of_home',
        'expected_price',
        'notes',
        'assigned_agent_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'expected_price' => 'decimal:2',
            'home_size' => 'decimal:2',
            'lot_size' => 'decimal:2',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Agent, $this>
     */
    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'assigned_agent_id', 'agent_id');
    }
}
