<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdatePropertyVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'owner_proof_status' => ['sometimes', Rule::in(['pending', 'verified', 'rejected'])],
            'owner_proof_notes' => ['nullable', 'string', 'max:1000'],
            'prc_verification_status' => ['sometimes', Rule::in(['pending', 'verified', 'rejected'])],
            'prc_verification_notes' => ['nullable', 'string', 'max:1000'],
            'admin_review_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
