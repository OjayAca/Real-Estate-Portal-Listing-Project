<x-mail::message>
# Verify Your New Email Address

Hi {{ $user->first_name }},

We received a request to change the email address associated with your account to **{{ $newEmail }}**.

To complete this change, please click the button below to verify your new email address. This link will expire in 60 minutes.

<x-mail::button :url="$verificationUrl">
Verify Email Address
</x-mail::button>

If you did not request this change, please ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
