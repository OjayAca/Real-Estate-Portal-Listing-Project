<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'buyer_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'buyer_email' => ['sometimes', 'nullable', 'email', 'max:180'],
            'buyer_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'message' => ['required', 'string', 'min:10'],
        ];
    }
}
