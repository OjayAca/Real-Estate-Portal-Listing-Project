<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreViewingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'requested_date' => 'required|date|after_or_equal:today',
            'requested_time' => 'required|date_format:H:i',
            'buyer_message' => 'nullable|string|max:1000',
        ];
    }
}
