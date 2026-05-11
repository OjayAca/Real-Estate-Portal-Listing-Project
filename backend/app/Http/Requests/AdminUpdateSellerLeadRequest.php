<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdateSellerLeadRequest extends FormRequest
{
    private const SELLER_LEAD_STATUSES = ['New', 'Contacted', 'Converted'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'required', Rule::in(self::SELLER_LEAD_STATUSES)],
            'assigned_agent_id' => [
                'sometimes',
                'nullable',
                Rule::exists('agents', 'agent_id')->where(fn($query) => $query->where('approval_status', 'approved')),
            ],
        ];
    }
}
