<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SellerLead extends Model
{
    use HasFactory;

    protected $primaryKey = 'seller_lead_id';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'property_type',
        'address_line',
        'city',
        'province',
        'expected_price',
        'timeline',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'expected_price' => 'decimal:2',
        ];
    }
}
