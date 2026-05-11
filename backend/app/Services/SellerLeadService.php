<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Mail\SellerLeadMail;
use App\Models\SellerLead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class SellerLeadService
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];

    private const HOME_CONDITIONS = [
        'Excellent - like new, move-in ready',
        'Good - well maintained, minor cosmetic needs',
        'Fair - functional, but needs updates',
        'Poor - needs major repairs/renovation',
        'New Construction',
    ];

    public function store(array $data): JsonResponse
    {
        $lead = SellerLead::query()->create($data);

        // Notify admins via email
        $admins = User::query()->where('role', UserRole::ADMIN->value)->get();
        if ($admins->isNotEmpty()) {
            Mail::to($admins)->send(new SellerLeadMail($lead));
        }

        return response()->json([
            'message' => 'Seller consultation request received.',
            'data' => [
                'seller_lead_id' => $lead->seller_lead_id,
                'created_at' => optional($lead->created_at)->toIso8601String(),
            ],
        ], 201);
    }
}
