<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyVerification extends Model
{
    use HasFactory;

    protected $primaryKey = 'property_verification_id';

    protected $fillable = [
        'property_id',
        'owner_proof_type',
        'owner_proof_path',
        'owner_proof_original_name',
        'owner_proof_status',
        'owner_proof_notes',
        'owner_proof_reviewed_by',
        'owner_proof_reviewed_at',
        'phone_verified_at',
        'phone_verified_phone',
        'authority_to_sell_confirmed_at',
        'prc_license_number',
        'prc_license_expires_at',
        'prc_verification_status',
        'prc_verification_notes',
        'prc_reviewed_by',
        'prc_reviewed_at',
        'legal_accuracy_accepted_at',
        'legal_no_duplicate_accepted_at',
        'legal_data_privacy_accepted_at',
        'legal_terms_version',
        'duplicate_checked_at',
        'admin_review_notes',
    ];

    protected function casts(): array
    {
        return [
            'owner_proof_reviewed_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'authority_to_sell_confirmed_at' => 'datetime',
            'prc_license_expires_at' => 'date',
            'prc_reviewed_at' => 'datetime',
            'legal_accuracy_accepted_at' => 'datetime',
            'legal_no_duplicate_accepted_at' => 'datetime',
            'legal_data_privacy_accepted_at' => 'datetime',
            'duplicate_checked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id', 'property_id');
    }
}
