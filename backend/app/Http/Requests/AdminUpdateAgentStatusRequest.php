<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdateAgentStatusRequest extends FormRequest
{
    private const AGENT_STATUSES = ['pending', 'approved', 'suspended'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'approval_status' => ['required', Rule::in(self::AGENT_STATUSES)],
        ];
    }
}
