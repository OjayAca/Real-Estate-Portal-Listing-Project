<?php

namespace App\Services;

use App\Models\SellerLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SellerLeadService
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
    private const TIMELINES = ['Immediately', '1-3 months', '3-6 months', 'Just exploring'];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:180'],
            'phone' => ['required', 'string', 'max:30'],
            'property_type' => ['required', Rule::in(self::PROPERTY_TYPES)],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'expected_price' => ['nullable', 'numeric', 'min:1'],
            'timeline' => ['required', Rule::in(self::TIMELINES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $lead = SellerLead::query()->create($validated);

        return response()->json([
            'message' => 'Seller consultation request received.',
            'data' => [
                'seller_lead_id' => $lead->seller_lead_id,
                'timeline' => $lead->timeline,
                'created_at' => optional($lead->created_at)->toIso8601String(),
            ],
        ], 201);
    }
}
