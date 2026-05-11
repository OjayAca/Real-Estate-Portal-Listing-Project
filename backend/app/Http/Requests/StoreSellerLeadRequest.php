<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSellerLeadRequest extends FormRequest
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];

    private const HOME_CONDITIONS = [
        'Excellent - like new, move-in ready',
        'Good - well maintained, minor cosmetic needs',
        'Fair - functional, but needs updates',
        'Poor - needs major repairs/renovation',
        'New Construction',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
        ];
    }
}
