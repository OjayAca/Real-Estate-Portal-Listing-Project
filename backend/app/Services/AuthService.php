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

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', Rule::in([UserRole::USER->value, UserRole::AGENT->value])],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
            'license_number' => ['nullable', 'required_if:role,agent', 'string', 'max:50', 'unique:agents,license_number'],
            'agency_name' => ['nullable', 'string', 'max:150'],
            'bio' => ['nullable', 'string'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::query()->create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
                'password' => $validated['password'],
                'is_active' => true,
            ]);

            if ($user->role === UserRole::AGENT) {
                $agency = ! empty($validated['agency_name'])
                    ? $this->portal->resolveAgency($validated['agency_name'])
                    : null;

                $agent = Agent::query()->create([
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone, // Now nullable in DB
                    'license_number' => $validated['license_number'],
                    'agency_id' => $agency?->agency_id,
                    'agency_name' => $validated['agency_name'] ?? null,
                    'approval_status' => 'pending',
                    'bio' => $validated['bio'] ?? null,
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

            return $user->load('agentProfile.agency');
        });

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => $user->isAgent()
                ? 'Agent account created. An admin still needs to approve the agent profile.'
                : 'Account created successfully.',
            'user' => $this->portal->formatUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->with('agentProfile.agency')->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been deactivated by an administrator.'], 403);
        }

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $this->portal->formatUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'user' => null,
            ]);
        }

        return response()->json([
            'user' => $this->portal->formatUser($user->load('agentProfile.agency')),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:20'],
            'bio' => ['nullable', 'string'],
        ]);
        $validated['phone'] = filled($validated['phone'] ?? null) ? $validated['phone'] : null;

        $user = DB::transaction(function () use ($request, $validated): User {
            $user = $request->user()->load('agentProfile.agency');
            $user->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'],
            ]);

            if ($user->agentProfile) {
                $user->agentProfile->update([
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'phone' => $validated['phone'],
                    'bio' => $validated['bio'] ?? $user->agentProfile->bio,
                ]);
            }

            return $user->fresh()->load('agentProfile.agency');
        });

        return response()->json([
            'message' => 'Profile updated.',
            'user' => $this->portal->formatUser($user),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $request->user()->update([
            'password' => $request->password,
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function requestEmailUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
        ]);

        $user = $request->user();
        $newEmail = $request->email;

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

    public function verifyEmailUpdate(Request $request, User $user): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return redirect(config('app.frontend_url').'/account/settings?error=invalid_signature');
        }

        $newEmail = $request->email;

        DB::transaction(function () use ($user, $newEmail): void {
            $user->update(['email' => $newEmail]);
            if ($user->agentProfile) {
                $user->agentProfile->update(['email' => $newEmail]);
            }
        });

        return redirect(config('app.frontend_url').'/account/settings?verified=1');
    }

    public function logout(Request $request): JsonResponse
    {
        $currentAccessToken = $request->user()->currentAccessToken();

        if ($currentAccessToken && method_exists($currentAccessToken, 'delete')) {
            $currentAccessToken->delete();
        }

        $webGuard = Auth::guard('web');

        if (method_exists($webGuard, 'logoutCurrentDevice')) {
            $webGuard->logoutCurrentDevice();
        } else {
            $webGuard->logout();
        }

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        Auth::forgetGuards();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = PasswordBroker::sendResetLink($validated);

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json([
            'message' => __($status),
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = PasswordBroker::reset(
            $validated,
            function (User $user, string $password) use ($request): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));

                if ($request->hasSession()) {
                    Auth::guard('web')->login($user);
                    $request->session()->regenerate();
                }
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        $user = User::query()->with('agentProfile.agency')->where('email', $validated['email'])->firstOrFail();

        return response()->json([
            'message' => __($status),
            'user' => $this->portal->formatUser($user),
        ]);
    }
}
