<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateViewingRequestStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:Confirmed,Rescheduled,Cancelled,Completed',
            'confirmed_date' => 'nullable|required_if:status,Confirmed,Rescheduled|date|after_or_equal:today',
            'confirmed_time' => 'nullable|required_if:status,Confirmed,Rescheduled|date_format:H:i',
            'agent_notes' => 'nullable|string|max:1000',
        ];
    }
}
