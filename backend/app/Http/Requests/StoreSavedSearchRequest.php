<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSavedSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'filters' => ['required', 'array'],
            'listing_purpose' => ['required', Rule::in(['sale', 'rent'])],
            'notify_email' => ['sometimes', 'boolean'],
        ];
    }
}
