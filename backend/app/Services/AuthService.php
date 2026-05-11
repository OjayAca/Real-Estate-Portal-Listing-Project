<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Mail\VerifyEmailChangeMail;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PortalService $portal,
    ) {}

    public function register(array $data, bool $hasSession = false): JsonResponse
    {
        $user = DB::transaction(function () use ($data): User {
            $user = User::query()->create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'role' => $data['role'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            if ($user->role === UserRole::AGENT) {
                $agency = ! empty($data['agency_name'])
                    ? $this->portal->resolveAgency($data['agency_name'])
                    : null;

                $agent = Agent::query()->create([
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone, // Now nullable in DB
                    'license_number' => $data['license_number'],
                    'agency_id' => $agency?->agency_id,
                    'agency_name' => $data['agency_name'] ?? null,
                    'approval_status' => 'pending',
                    'bio' => $data['bio'] ?? null,
                ]);

                foreach (User::query()->where('role', UserRole::ADMIN->value)->get() as $admin) {
                    $this->notifications->pushNotification(
                        $admin,
                        'agent.registration',
                        'New agent registration',
                        $agent->full_name.' submitted an agent account for approval.',
                        ['agent_id' => $agent->agent_id, 'user_id' => $user->id]
                    );
                }
            }

            return $user->load('agent.agency');
        });

        if ($hasSession) {
            Auth::guard('web')->login($user);
            request()->session()->regenerate();
        }

        return response()->json([
            'message' => $user->isAgent()
                ? 'Agent account created. An admin still needs to approve the agent profile.'
                : 'Account created successfully.',
            'user' => $this->portal->formatUser($user),
        ], 201);
    }

    public function login(array $credentials, bool $hasSession = false): JsonResponse
    {
        $user = User::query()->with('agent.agency')->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been deactivated by an administrator.'], 403);
        }

        if ($hasSession) {
            Auth::guard('web')->login($user);
            request()->session()->regenerate();
        }

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $this->portal->formatUser($user),
        ]);
    }

    public function me(?User $user): JsonResponse
    {
        if (! $user) {
            return response()->json([
                'user' => null,
            ]);
        }

        return response()->json([
            'user' => $this->portal->formatUser($user->load('agent.agency')),
        ]);
    }

    public function updateProfile(array $data, User $user): JsonResponse
    {
        $data['phone'] = filled($data['phone'] ?? null) ? $data['phone'] : null;

        $user = DB::transaction(function () use ($user, $data): User {
            $user->load('agent.agency');
            $user->update([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'phone' => $data['phone'],
            ]);

            if ($user->agent) {
                $user->agent->update([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'phone' => $data['phone'],
                    'bio' => $data['bio'] ?? $user->agent->bio,
                ]);
            }

            return $user->fresh()->load('agent.agency');
        });

        return response()->json([
            'message' => 'Profile updated.',
            'user' => $this->portal->formatUser($user),
        ]);
    }

    public function updatePassword(array $data, User $user): JsonResponse
    {
        $user->update([
            'password' => $data['password'],
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function requestEmailUpdate(array $data, User $user): JsonResponse
    {
        $newEmail = $data['email'];

        $verificationUrl = URL::temporarySignedRoute(
            'auth.email.verify',
            now()->addMinutes(60),
            ['user' => $user->id, 'email' => $newEmail]
        );

        Mail::to($newEmail)->send(new VerifyEmailChangeMail($user, $newEmail, $verificationUrl));

        return response()->json([
            'message' => 'A verification email has been sent to '.$newEmail.'. Please click the link in the email to complete the update.',
        ]);
    }

    public function verifyEmailUpdate(User $user, string $email, bool $hasValidSignature): RedirectResponse
    {
        if (! $hasValidSignature) {
            return redirect(config('app.frontend_url').'/account/settings?error=invalid_signature');
        }

        DB::transaction(function () use ($user, $email): void {
            $user->update(['email' => $email]);
            if ($user->agent) {
                $user->agent->update(['email' => $email]);
            }
        });

        return redirect(config('app.frontend_url').'/account/settings?verified=1');
    }

    public function logout(User $user, bool $hasSession = false): JsonResponse
    {
        $currentAccessToken = $user->currentAccessToken();

        if ($currentAccessToken && method_exists($currentAccessToken, 'delete')) {
            $currentAccessToken->delete();
        }

        $webGuard = Auth::guard('web');

        if (method_exists($webGuard, 'logoutCurrentDevice')) {
            $webGuard->logoutCurrentDevice();
        } else {
            $webGuard->logout();
        }

        if ($hasSession) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }

        Auth::forgetGuards();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function forgotPassword(array $data): JsonResponse
    {
        $status = PasswordBroker::sendResetLink($data);

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json([
            'message' => __($status),
        ]);
    }

    public function resetPassword(array $data, bool $hasSession = false): JsonResponse
    {
        $status = PasswordBroker::reset(
            $data,
            function (User $user, string $password) use ($hasSession): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));

                if ($hasSession) {
                    Auth::guard('web')->login($user);
                    request()->session()->regenerate();
                }
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        $user = User::query()->with('agent.agency')->where('email', $data['email'])->firstOrFail();

        return response()->json([
            'message' => __($status),
            'user' => $this->portal->formatUser($user),
        ]);
    }
}
