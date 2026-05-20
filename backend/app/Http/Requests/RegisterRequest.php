<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', Rule::in([UserRole::USER->value, UserRole::AGENT->value])],
            'password' => ['required', 'confirmed', Password::defaults()],
            'license_number' => ['nullable', 'required_if:role,agent', 'string', 'max:50'],
            'dhsud_registration_number' => ['nullable', 'string', 'max:80'],
            'profile_picture_upload' => [
                'nullable',
                File::image()->types(['jpg', 'jpeg', 'png'])->max(5120),
            ],
            'agency_name' => ['nullable', 'string', 'max:150'],
            'bio' => ['nullable', 'string'],
        ];
    }
}
