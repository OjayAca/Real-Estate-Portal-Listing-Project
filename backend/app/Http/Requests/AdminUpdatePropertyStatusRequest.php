<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdatePropertyStatusRequest extends FormRequest
{
    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive', 'Pending Sold', 'Pending Rented', 'Pending Review'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(self::PROPERTY_STATUSES)],
            'status_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
