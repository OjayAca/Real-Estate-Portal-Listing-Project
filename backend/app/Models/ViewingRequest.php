<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ViewingRequest extends Model
{
    protected $primaryKey = 'viewing_request_id';

    protected $fillable = [
        'buyer_id',
        'agent_id',
        'property_id',
        'requested_date',
        'requested_time',
        'confirmed_date',
        'confirmed_time',
        'status',
        'buyer_message',
        'agent_notes',
    ];

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class, 'property_id');
    }
}
