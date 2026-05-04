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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:180'],
            'phone' => ['required', 'string', 'max:30'],
            'property_type' => ['required', Rule::in(self::PROPERTY_TYPES)],
            'property_address' => ['required', 'string', 'max:255'],
            'bedrooms' => ['required', 'integer', 'min:0', 'max:50'],
            'bathrooms' => ['required', 'integer', 'min:0', 'max:50'],
            'home_size' => ['nullable', 'numeric', 'min:1'],
            'lot_size' => ['nullable', 'numeric', 'min:1'],
            'condition_of_home' => ['required', Rule::in(self::HOME_CONDITIONS)],
            'expected_price' => ['nullable', 'numeric', 'min:1'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $lead = SellerLead::query()->create($validated);

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
