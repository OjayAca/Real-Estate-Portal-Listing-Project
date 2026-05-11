<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StorePropertyRequest extends FormRequest
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
    private const LISTING_PURPOSES = ['sale', 'rent'];
    private const AGENT_CREATE_STATUSES = ['Draft', 'Pending Review'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string'],
            'property_type' => ['required', Rule::in(self::PROPERTY_TYPES)],
            'listing_purpose' => ['sometimes', Rule::in(self::LISTING_PURPOSES)],
            'price' => ['required', 'numeric', 'min:1'],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'parking_spaces' => ['nullable', 'integer', 'min:0', 'max:20'],
            'area_sqm' => ['nullable', 'integer', 'min:0'],
            'address_line' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'featured_image' => ['nullable', 'string', 'max:255'],
            'featured_image_upload' => [
                'nullable',
                'file',
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(25600),
                Rule::dimensions()
                    ->minWidth(1200)
                    ->minHeight(675)
                    ->maxWidth(4000)
                    ->maxHeight(4000),
            ],
            'status' => ['nullable', Rule::in(self::AGENT_CREATE_STATUSES)],
            'status_reason' => ['nullable', 'string', 'max:255'],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,amenity_id'],
        ];
    }
}
