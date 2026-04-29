<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Support\ImageUrlResolver;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PortalService
{
    private const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
    private const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive'];
    private const AGENT_ALLOWED_STATUSES = ['Draft', 'Available', 'Sold', 'Rented'];
    private const INQUIRY_STATUSES = ['New', 'Read', 'Responded', 'Closed'];
    private const AGENT_STATUSES = ['pending', 'approved', 'suspended'];
    private const FEATURED_IMAGE_MAX_SIZE_KB = 25600;
    private const FEATURED_IMAGE_MIN_WIDTH = 1200;
    private const FEATURED_IMAGE_MIN_HEIGHT = 675;
    private const FEATURED_IMAGE_MAX_WIDTH = 4000;
    private const FEATURED_IMAGE_MAX_HEIGHT = 4000;
    private const FEATURED_IMAGE_TARGET_WIDTH = 1600;
    private const FEATURED_IMAGE_TARGET_HEIGHT = 900;
    private const FEATURED_IMAGE_JPEG_QUALITY = 82;
    private const FEATURED_IMAGE_WEBP_QUALITY = 82;
    private const FEATURED_IMAGE_PNG_COMPRESSION = 8;
    private const MAX_PER_PAGE = 24;

    public function amenitiesIndex(): JsonResponse
    {
        $amenities = Amenity::query()->orderBy('amenity_category')->orderBy('amenity_name')->get();

        return response()->json([
            'data' => $amenities->map(fn (Amenity $amenity) => $this->formatAmenity($amenity)),
        ]);
    }

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
                    ? $this->resolveAgency($validated['agency_name'])
                    : null;

                $agent = Agent::query()->create([
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone ?? 'Not provided',
                    'license_number' => $validated['license_number'],
                    'agency_id' => $agency?->agency_id,
                    'agency_name' => $validated['agency_name'] ?? null,
                    'approval_status' => 'pending',
                    'bio' => $validated['bio'] ?? null,
                ]);

                foreach (User::query()->where('role', UserRole::ADMIN->value)->get() as $admin) {
                    $this->pushNotification(
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

        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json([
            'message' => $user->isAgent()
                ? 'Agent account created. An admin still needs to approve the agent profile.'
                : 'Account created successfully.',
            'user' => $this->formatUser($user),
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
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
            'user' => $this->formatUser($user),
            'requires_email_verification' => ! $user->hasVerifiedEmail(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'user' => null,
                'unread_notifications' => 0,
            ]);
        }

        return response()->json([
            'user' => $this->formatUser($user->load('agentProfile.agency')),
            'unread_notifications' => $user->unreadNotifications()->count(),
        ]);
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

    public function sendVerificationNotification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email address is already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'A fresh verification link has been sent to your email address.',
        ], 202);
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
            'user' => $this->formatUser($user),
        ]);
    }

    public function propertiesIndex(Request $request): JsonResponse
    {
        $query = Property::query()
            ->with(['agent.user', 'amenities'])
            ->withCount('inquiries')
            ->orderByDesc('listed_at')
            ->orderByDesc('created_at');

        $user = $request->user();
        $requestedStatus = $request->query('status');

        if ($requestedStatus && $user && ($user->isAdmin() || $user->isAgent())) {
            $query->where('status', $requestedStatus);
        } else {
            $query->where('status', 'Available');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%")
                    ->orWhere('address_line', 'like', "%{$search}%");
            });
        }

        if ($type = $request->query('property_type')) {
            $query->where('property_type', $type);
        }

        if ($city = $request->query('city')) {
            $query->where('city', 'like', "%{$city}%");
        }

        if ($province = $request->query('province')) {
            $query->where('province', 'like', "%{$province}%");
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        if ($request->filled('bedrooms')) {
            $query->where('bedrooms', '>=', (int) $request->query('bedrooms'));
        }

        if ($request->filled('bathrooms')) {
            $query->where('bathrooms', '>=', (int) $request->query('bathrooms'));
        }

        if ($request->filled('amenity_id')) {
            $query->whereHas('amenities', fn ($builder) => $builder->where('amenity_id', $request->integer('amenity_id')));
        }

        $perPage = max(1, min($request->integer('per_page', 9), self::MAX_PER_PAGE));
        $properties = $query->paginate($perPage)->withQueryString();

        return response()->json($this->paginatedPropertiesResponse($properties));
    }

    public function propertyShow(Request $request, Property $property): JsonResponse
    {
        $property->loadMissing(['agent.user', 'amenities']);
        $user = $request->user();

        $canViewPrivate = $user && ($user->isAdmin() || ($user->isAgent() && $user->agentProfile?->agent_id === $property->agent_id));

        if (! $canViewPrivate && $property->status !== 'Available') {
            abort(404);
        }

        return response()->json([
            'data' => $this->formatProperty($property),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('agentProfile.agency');

        if ($user->isAdmin()) {
            return response()->json([
                'role' => $user->role->value,
                'stats' => [
                    'users' => User::query()->count(),
                    'agents' => Agent::query()->count(),
                    'properties' => Property::query()->count(),
                    'inquiries' => Inquiry::query()->count(),
                    'bookings' => ViewingBooking::query()->count(),
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ],
                'recent_users' => User::query()->with('agentProfile')->latest()->take(5)->get()->map(fn (User $entry) => $this->formatUser($entry)),
                'recent_properties' => Property::query()->with(['agent.user', 'amenities'])->latest()->take(5)->get()->map(fn (Property $entry) => $this->formatProperty($entry)),
            ]);
        }

        if ($user->isAgent()) {
            $agent = $user->agentProfile;

            if (! $agent) {
                abort(404, 'No agent profile is linked to this account.');
            }

            if (! $agent->isApproved()) {
                return response()->json([
                    'role' => $user->role->value,
                    'stats' => [
                        'properties' => 0,
                        'active_listings' => 0,
                        'new_inquiries' => 0,
                        'closed_inquiries' => 0,
                        'unread_notifications' => $user->unreadNotifications()->count(),
                    ],
                    'profile' => $this->formatAgent($agent),
                    'properties' => [],
                    'recent_inquiries' => [],
                ]);
            }

            $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->take(5)->get();
            $inquiries = Inquiry::query()->with(['property.agent.user', 'user'])
                ->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))
                ->latest()
                ->take(6)
                ->get();

            return response()->json([
                'role' => $user->role->value,
                'stats' => [
                    'properties' => Property::query()->where('agent_id', $agent->agent_id)->count(),
                    'active_listings' => Property::query()->where('agent_id', $agent->agent_id)->where('status', 'Available')->count(),
                    'new_inquiries' => Inquiry::query()->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))->where('status', 'New')->count(),
                    'closed_inquiries' => Inquiry::query()->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))->where('status', 'Closed')->count(),
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ],
                'profile' => $this->formatAgent($agent),
                'properties' => $properties->map(fn (Property $entry) => $this->formatProperty($entry)),
                'recent_inquiries' => $inquiries->map(fn (Inquiry $entry) => $this->formatInquiry($entry)),
            ]);
        }

        $saved = $user->savedProperties()->with(['agent.user', 'amenities'])->latest()->take(6)->get();
        $inquiries = $user->inquiries()->with(['property.agent.user'])->latest()->take(6)->get();
        $bookings = $user->viewingBookings()->with(['property.agent.user'])->latest()->take(6)->get();

        return response()->json([
            'role' => $user->role->value,
            'stats' => [
                'saved_properties' => $user->savedProperties()->count(),
                'inquiries' => $user->inquiries()->count(),
                'viewing_bookings' => $user->viewingBookings()->count(),
                'unread_notifications' => $user->unreadNotifications()->count(),
            ],
            'saved_properties' => $saved->map(fn (Property $entry) => $this->formatProperty($entry)),
            'recent_inquiries' => $inquiries->map(fn (Inquiry $entry) => $this->formatInquiry($entry)),
            'recent_bookings' => $bookings->map(fn (ViewingBooking $entry) => $this->formatBooking($entry)),
        ]);
    }

    public function notificationsIndex(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->latest()->take(25)->get();

        return response()->json([
            'data' => $notifications->map(fn (DatabaseNotification $notification) => $this->formatNotification($notification)),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        $entry = $request->user()->notifications()->whereKey($notification)->firstOrFail();
        $entry->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->formatNotification($entry->fresh()),
        ]);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function savedPropertiesIndex(Request $request): JsonResponse
    {
        $properties = $request->user()->savedProperties()->with(['agent.user', 'amenities'])->latest()->get();

        return response()->json([
            'data' => $properties->map(fn (Property $property) => $this->formatProperty($property)),
        ]);
    }

    public function saveProperty(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'Only available properties can be saved.'], 422);
        }

        $request->user()->savedProperties()->syncWithoutDetaching([$property->property_id]);

        return response()->json(['message' => 'Property saved.']);
    }

    public function unsaveProperty(Request $request, Property $property): JsonResponse
    {
        $request->user()->savedProperties()->detach($property->property_id);

        return response()->json(['message' => 'Property removed from saved listings.']);
    }

    public function createInquiry(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'This property is not accepting inquiries right now.'], 422);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:10'],
        ]);

        $user = $request->user();
        $property->loadMissing('agent.user');

        $inquiry = Inquiry::query()->create([
            'property_id' => $property->property_id,
            'user_id' => $user->id,
            'buyer_name' => $user->full_name,
            'buyer_email' => $user->email,
            'buyer_phone' => $user->phone,
            'message' => $validated['message'],
            'status' => 'New',
        ]);

        if ($property->agent?->user) {
            $this->pushNotification(
                $property->agent->user,
                'inquiry.new',
                'New buyer inquiry',
                $user->full_name.' sent an inquiry about '.$property->title.'.',
                ['property_id' => $property->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        foreach (User::query()->where('role', UserRole::ADMIN->value)->get() as $admin) {
            $this->pushNotification(
                $admin,
                'inquiry.new',
                'Inquiry received',
                'A new inquiry was submitted for '.$property->title.'.',
                ['property_id' => $property->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Inquiry sent successfully.',
            'data' => $this->formatInquiry($inquiry->load(['property.agent.user', 'user'])),
        ], 201);
    }

    public function agentPropertiesIndex(Request $request): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        $properties = Property::query()->with(['agent.user', 'amenities'])->where('agent_id', $agent->agent_id)->latest()->get();

        return response()->json([
            'data' => $properties->map(fn (Property $property) => $this->formatProperty($property)),
        ]);
    }

    public function agentPropertyStore(Request $request): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        [$payload, $amenityIds] = $this->validatePropertyPayload($request, $agent, false, null, self::AGENT_ALLOWED_STATUSES);
        $payload['agent_id'] = $agent->agent_id;
        $payload['slug'] = $this->generateSlug($payload['title']);
        $payload['listed_at'] = ($payload['status'] ?? 'Available') === 'Available' ? now() : null;

        $property = Property::query()->create($payload);
        $property->amenities()->sync($amenityIds);

        return response()->json([
            'message' => 'Property listing created.',
            'data' => $this->formatProperty($property->load(['agent.user', 'amenities'])),
        ], 201);
    }

    public function agentPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        $this->guardOwnProperty($agent, $property);

        $allowedStatuses = self::AGENT_ALLOWED_STATUSES;
        // Agents can only set/keep Draft status if the property is already in Draft status.
        // This prevents reverting a listed property (Available, Sold, Rented) back to Draft.
        if ($property->status !== 'Draft') {
            $allowedStatuses = array_values(array_diff($allowedStatuses, ['Draft']));
        }

        [$payload, $amenityIds] = $this->validatePropertyPayload($request, $agent, true, $property, $allowedStatuses);

        if (array_key_exists('title', $payload)) {
            $payload['slug'] = $this->generateSlug($payload['title'], $property);
        }

        if (($payload['status'] ?? null) === 'Available' && ! $property->listed_at) {
            $payload['listed_at'] = now();
        }

        $property->update($payload);
        if ($amenityIds !== null) {
            $property->amenities()->sync($amenityIds);
        }

        return response()->json([
            'message' => 'Property listing updated.',
            'data' => $this->formatProperty($property->fresh()->load(['agent.user', 'amenities'])),
        ]);
    }

    public function agentPropertyDestroy(Request $request, Property $property): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        $this->guardOwnProperty($agent, $property);

        if (ImageUrlResolver::isManaged($property->featured_image)) {
            Storage::disk('public')->delete($property->featured_image);
        }

        $property->delete();

        return response()->json(['message' => 'Property listing deleted.']);
    }

    public function agentInquiriesIndex(Request $request): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        $inquiries = Inquiry::query()
            ->with(['property.agent.user', 'user'])
            ->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))
            ->latest()
            ->get();

        return response()->json([
            'data' => $inquiries->map(fn (Inquiry $inquiry) => $this->formatInquiry($inquiry)),
        ]);
    }

    public function agentInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        $agent = $this->requireApprovedAgent($request->user());
        $inquiry->loadMissing('property.agent.user', 'user');
        $this->guardOwnProperty($agent, $inquiry->property);

        $validated = $request->validate([
            'status' => ['required', Rule::in(self::INQUIRY_STATUSES)],
            'response_message' => [
                Rule::requiredIf(fn () => $request->status === 'Responded' || $request->status === 'Closed'),
                'nullable',
                'string',
            ],
        ]);

        $inquiry->status = $validated['status'];
        $inquiry->response_message = $validated['response_message'] ?? $inquiry->response_message;
        if ($inquiry->status === 'Responded' || $inquiry->status === 'Closed' || $inquiry->response_message) {
            $inquiry->responded_at = now();
        }
        $inquiry->save();

        if ($inquiry->user) {
            $this->pushNotification(
                $inquiry->user,
                'inquiry.update',
                'Inquiry updated',
                'Your inquiry for '.$inquiry->property->title.' was updated to '.$inquiry->status.'.',
                ['property_id' => $inquiry->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Inquiry updated.',
            'data' => $this->formatInquiry($inquiry->fresh()->load(['property.agent.user', 'user'])),
        ]);
    }

    public function buyerInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        $user = $request->user();
        if ($inquiry->user_id !== $user->id) {
            abort(403, 'This inquiry does not belong to you.');
        }

        $validated = $request->validate([
            'buyer_reply' => ['required', 'string', 'min:5'],
        ]);

        if ($inquiry->buyer_reply) {
            return response()->json(['message' => 'You have already sent a follow-up reply for this inquiry.'], 422);
        }

        $inquiry->update([
            'buyer_reply' => $validated['buyer_reply'],
            'buyer_replied_at' => now(),
        ]);

        $inquiry->loadMissing('property.agent.user');
        if ($inquiry->property->agent?->user) {
            $this->pushNotification(
                $inquiry->property->agent->user,
                'inquiry.reply',
                'Buyer sent a follow-up',
                $user->full_name.' replied to your response regarding '.$inquiry->property->title.'.',
                ['property_id' => $inquiry->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Your reply has been sent.',
            'data' => $this->formatInquiry($inquiry->fresh()->load(['property.agent.user', 'user'])),
        ]);
    }

    public function adminOverview(Request $request): JsonResponse
    {
        $userSearch = $request->query('user_search');
        $agentSearch = $request->query('agent_search');
        $propertySearch = $request->query('property_search');

        $usersQuery = User::query()->with('agentProfile')->latest();
        if ($userSearch) {
            $usersQuery->where(function ($query) use ($userSearch): void {
                $query->where('first_name', 'like', "%{$userSearch}%")
                    ->orWhere('last_name', 'like', "%{$userSearch}%")
                    ->orWhere('email', 'like', "%{$userSearch}%");
            });
        }
        $users = $usersQuery->take(50)->get();

        $agentsQuery = Agent::query()->with('user')->latest();
        if ($agentSearch) {
            $agentsQuery->where(function ($query) use ($agentSearch): void {
                $query->where('first_name', 'like', "%{$agentSearch}%")
                    ->orWhere('last_name', 'like', "%{$agentSearch}%")
                    ->orWhere('agency_name', 'like', "%{$agentSearch}%")
                    ->orWhere('email', 'like', "%{$agentSearch}%");
            });
        }
        $agents = $agentsQuery->take(50)->get();

        $propertiesQuery = Property::query()->with(['agent.user', 'amenities'])->latest();
        if ($propertySearch) {
            $propertiesQuery->where(function ($query) use ($propertySearch): void {
                $query->where('title', 'like', "%{$propertySearch}%")
                    ->orWhere('city', 'like', "%{$propertySearch}%")
                    ->orWhere('province', 'like', "%{$propertySearch}%")
                    ->orWhere('address_line', 'like', "%{$propertySearch}%");
            });
        }
        $properties = $propertiesQuery->take(50)->get();

        $inquiries = Inquiry::query()->with(['property.agent.user', 'user'])->latest()->take(10)->get();

        return response()->json([
            'stats' => [
                'users' => User::query()->count(),
                'agents' => Agent::query()->count(),
                'available_properties' => Property::query()->where('status', 'Available')->count(),
                'pending_agents' => Agent::query()->where('approval_status', 'pending')->count(),
                'open_inquiries' => Inquiry::query()->whereIn('status', ['New', 'Read'])->count(),
            ],
            'users' => $users->map(fn (User $user) => $this->formatUser($user)),
            'agents' => $agents->map(fn (Agent $agent) => $this->formatAgent($agent)),
            'properties' => $properties->map(fn (Property $property) => $this->formatProperty($property)),
            'inquiries' => $inquiries->map(fn (Inquiry $inquiry) => $this->formatInquiry($inquiry)),
        ]);
    }

    public function adminUserUpdate(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
            'role' => ['nullable', Rule::in(UserRole::values())],
        ]);

        if ($user->isAdmin() && $validated['is_active'] === false) {
            return response()->json(['message' => 'Administrator accounts cannot be suspended.'], 403);
        }

        if (($validated['role'] ?? null) === UserRole::AGENT->value && ! $user->agentProfile) {
            return response()->json(['message' => 'Create an agent profile before promoting this user to agent.'], 422);
        }

        if ($user->isAgent() && ($validated['role'] ?? $user->role->value) !== UserRole::AGENT->value) {
            $activeListings = Property::query()
                ->where('agent_id', $user->agentProfile?->agent_id)
                ->whereIn('status', ['Available', 'Sold', 'Rented'])
                ->count();

            if ($activeListings > 0) {
                return response()->json(['message' => 'This agent has active or historical listings and cannot be demoted. Delete or reassign listings first.'], 422);
            }
        }

        $user->update([
            'is_active' => $validated['is_active'],
            'role' => $validated['role'] ?? $user->role->value,
        ]);

        return response()->json([
            'message' => 'User updated.',
            'data' => $this->formatUser($user->fresh()->load('agentProfile')),
        ]);
    }

    public function adminAgentUpdate(Request $request, Agent $agent): JsonResponse
    {
        $validated = $request->validate([
            'approval_status' => ['required', Rule::in(self::AGENT_STATUSES)],
        ]);

        $agent->update(['approval_status' => $validated['approval_status']]);

        if ($agent->isApproved()) {
            $this->ensureDefaultAvailability($agent);
        }

        if ($agent->user) {
            $this->pushNotification(
                $agent->user,
                'agent.status',
                'Agent profile updated',
                'Your agent approval status is now '.Str::headline($agent->approval_status).'.',
                ['agent_id' => $agent->agent_id]
            );
        }

        return response()->json([
            'message' => 'Agent status updated.',
            'data' => $this->formatAgent($agent->fresh()->load('user')),
        ]);
    }

    private function ensureDefaultAvailability(Agent $agent): void
    {
        if (DB::table('agent_availabilities')->where('agent_id', $agent->agent_id)->exists()) {
            return;
        }

        foreach ([1, 2, 3, 4, 5] as $day) {
            DB::table('agent_availabilities')->insert([
                'agent_id' => $agent->agent_id,
                'day_of_week' => $day,
                'start_time' => '09:00',
                'end_time' => '17:00',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function adminPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::PROPERTY_STATUSES)],
        ]);

        $property->loadMissing('agent.user', 'amenities');
        $property->update(['status' => $validated['status']]);

        if ($property->agent?->user) {
            $this->pushNotification(
                $property->agent->user,
                'property.status',
                'Listing status changed',
                $property->title.' is now marked as '.$property->status.'.',
                ['property_id' => $property->property_id]
            );
        }

        return response()->json([
            'message' => 'Property status updated.',
            'data' => $this->formatProperty($property->fresh()->load(['agent.user', 'amenities'])),
        ]);
    }

    /**
     * @param  array<string>|null  $allowedStatuses
     * @return array{0: array<string, mixed>, 1: array<int>|null}
     */
    private function validatePropertyPayload(Request $request, Agent $agent, bool $isUpdate = false, ?Property $property = null, ?array $allowedStatuses = null): array
    {
        $required = $isUpdate ? ['sometimes'] : ['required'];
        $allowedStatuses ??= self::PROPERTY_STATUSES;

        $validated = $request->validate([
            'title' => array_merge($required, ['string', 'max:150']),
            'description' => array_merge($required, ['string']),
            'property_type' => array_merge($required, [Rule::in(self::PROPERTY_TYPES)]),
            'price' => array_merge($required, ['numeric', 'min:1']),
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'parking_spaces' => ['nullable', 'integer', 'min:0', 'max:20'],
            'area_sqm' => ['nullable', 'integer', 'min:0'],
            'address_line' => array_merge($required, ['string', 'max:255']),
            'city' => array_merge($required, ['string', 'max:100']),
            'province' => array_merge($required, ['string', 'max:100']),
            'featured_image' => ['nullable', 'string', 'max:255'],
            'featured_image_upload' => [
                'nullable',
                'file',
                File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(self::FEATURED_IMAGE_MAX_SIZE_KB),
                Rule::dimensions()
                    ->minWidth(self::FEATURED_IMAGE_MIN_WIDTH)
                    ->minHeight(self::FEATURED_IMAGE_MIN_HEIGHT)
                    ->maxWidth(self::FEATURED_IMAGE_MAX_WIDTH)
                    ->maxHeight(self::FEATURED_IMAGE_MAX_HEIGHT),
            ],
            'status' => ['nullable', Rule::in($allowedStatuses)],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,amenity_id'],
        ]);

        if ($request->hasFile('featured_image_upload')) {
            $validated['featured_image'] = $this->storeFeaturedImage($request->file('featured_image_upload'), $agent, $property);
        }

        $amenityIds = $validated['amenity_ids'] ?? ($isUpdate ? null : []);
        unset($validated['amenity_ids']);
        unset($validated['featured_image_upload']);

        return [$validated, $amenityIds];
    }

    private function storeFeaturedImage(UploadedFile $file, Agent $agent, ?Property $existingProperty = null): string
    {
        $path = $this->optimizeAndStoreFeaturedImage($file, $agent);

        if ($existingProperty && ImageUrlResolver::isManaged($existingProperty->featured_image)) {
            Storage::disk('public')->delete($existingProperty->featured_image);
        }

        return $path;
    }

    private function optimizeAndStoreFeaturedImage(UploadedFile $file, Agent $agent): string
    {
        $sourcePath = $file->getRealPath();
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType();

        if (! $sourcePath || ! $mimeType || ! function_exists('imagecreatetruecolor')) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        }

        $sourceImage = $this->createImageResource($sourcePath, $mimeType);

        if (! $sourceImage) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        }

        try {
            $sourceImage = $this->applyExifOrientationIfNeeded($sourceImage, $sourcePath, $mimeType);

            $sourceWidth = imagesx($sourceImage);
            $sourceHeight = imagesy($sourceImage);

            if ($sourceWidth <= 0 || $sourceHeight <= 0) {
                return $file->store("properties/agent-{$agent->agent_id}", 'public');
            }

            $targetImage = $this->resizeImageResource(
                $sourceImage,
                $sourceWidth,
                $sourceHeight,
                self::FEATURED_IMAGE_TARGET_WIDTH,
                self::FEATURED_IMAGE_TARGET_HEIGHT,
                $mimeType
            );

            if (! $targetImage) {
                return $file->store("properties/agent-{$agent->agent_id}", 'public');
            }

            $extension = $this->imageExtensionForMimeType($mimeType);
            $path = "properties/agent-{$agent->agent_id}/".Str::random(40).'.'.$extension;
            $binary = $this->encodeImageResource($targetImage, $mimeType);

            Storage::disk('public')->put($path, $binary);

            if ($targetImage !== $sourceImage) {
                imagedestroy($targetImage);
            }

            return $path;
        } catch (\Throwable $e) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        } finally {
            if (is_resource($sourceImage) || (PHP_VERSION_ID >= 80000 && $sourceImage instanceof \GdImage)) {
                imagedestroy($sourceImage);
            }
        }
    }

    private function createImageResource(string $path, string $mimeType): mixed
    {
        return match ($mimeType) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default => false,
        };
    }

    private function applyExifOrientationIfNeeded(mixed $image, string $path, string $mimeType): mixed
    {
        if (! function_exists('exif_read_data') || ! in_array($mimeType, ['image/jpeg', 'image/jpg'], true)) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = $exif['Orientation'] ?? null;

        $rotatedImage = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };

        if ($rotatedImage !== $image) {
            imagedestroy($image);
        }

        return $rotatedImage;
    }

    private function resizeImageResource(
        mixed $sourceImage,
        int $sourceWidth,
        int $sourceHeight,
        int $targetMaxWidth,
        int $targetMaxHeight,
        string $mimeType
    ): mixed {
        $scale = min(
            $targetMaxWidth / max($sourceWidth, 1),
            $targetMaxHeight / max($sourceHeight, 1),
            1
        );

        $targetWidth = max((int) round($sourceWidth * $scale), 1);
        $targetHeight = max((int) round($sourceHeight * $scale), 1);

        if ($targetWidth === $sourceWidth && $targetHeight === $sourceHeight) {
            return $sourceImage;
        }

        $targetImage = imagecreatetruecolor($targetWidth, $targetHeight);

        if (in_array($mimeType, ['image/png', 'image/webp'], true)) {
            imagealphablending($targetImage, false);
            imagesavealpha($targetImage, true);
            $transparent = imagecolorallocatealpha($targetImage, 0, 0, 0, 127);
            imagefilledrectangle($targetImage, 0, 0, $targetWidth, $targetHeight, $transparent);
        }

        imagecopyresampled(
            $targetImage,
            $sourceImage,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight
        );

        return $targetImage;
    }

    private function encodeImageResource(mixed $image, string $mimeType): string
    {
        ob_start();

        match ($mimeType) {
            'image/jpeg', 'image/jpg' => imagejpeg($image, null, self::FEATURED_IMAGE_JPEG_QUALITY),
            'image/png' => imagepng($image, null, self::FEATURED_IMAGE_PNG_COMPRESSION),
            'image/webp' => imagewebp($image, null, self::FEATURED_IMAGE_WEBP_QUALITY),
            default => imagejpeg($image, null, self::FEATURED_IMAGE_JPEG_QUALITY),
        };

        return (string) ob_get_clean();
    }

    private function imageExtensionForMimeType(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => strtolower($mimeType),
        };
    }

    private function generateSlug(string $title, ?Property $existing = null): string
    {
        $slug = Str::slug($title);
        $candidate = $slug;
        $counter = 1;

        while (Property::query()
            ->where('slug', $candidate)
            ->when($existing, fn ($builder) => $builder->where('property_id', '!=', $existing->property_id))
            ->exists()) {
            $candidate = $slug.'-'.$counter;
            $counter++;
        }

        return $candidate;
    }

    private function resolveAgency(string $name): Agency
    {
        $trimmed = trim($name);
        $slug = Str::slug($trimmed);
        $candidate = $slug;
        $counter = 1;

        while (Agency::query()->where('slug', $candidate)->where('name', '!=', $trimmed)->exists()) {
            $candidate = $slug.'-'.$counter;
            $counter++;
        }

        return Agency::query()->firstOrCreate(
            ['name' => $trimmed],
            [
                'slug' => $candidate,
                'agency_type' => 'Agency',
            ],
        );
    }

    private function pushNotification(User $user, string $type, string $title, string $message, array $context = []): void
    {
        $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'data' => array_merge([
                'title' => $title,
                'message' => $message,
            ], $context),
        ]);
    }

    private function paginatedPropertiesResponse(LengthAwarePaginator $properties): array
    {
        return [
            'data' => collect($properties->items())->map(fn (Property $property) => $this->formatProperty($property))->values(),
            'meta' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ],
        ];
    }

    private function requireApprovedAgent(User $user): Agent
    {
        $agent = $user->agentProfile;

        if (! $agent) {
            abort(404, 'No agent profile is linked to this account.');
        }

        if (! $agent->isApproved()) {
            abort(403, 'Your agent profile is not approved yet.');
        }

        return $agent;
    }

    private function guardOwnProperty(Agent $agent, Property $property): void
    {
        if ($property->agent_id !== $agent->agent_id) {
            abort(403, 'This property does not belong to the authenticated agent.');
        }
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'email_verified_at' => optional($user->email_verified_at)->toIso8601String(),
            'phone' => $user->phone,
            'role' => $user->role->value,
            'is_active' => $user->is_active,
            'created_at' => optional($user->created_at)->toIso8601String(),
            'agent_profile' => $user->relationLoaded('agentProfile') && $user->agentProfile
                ? $this->formatAgent($user->agentProfile)
                : null,
        ];
    }

    private function formatAgent(Agent $agent): array
    {
        return [
            'agent_id' => $agent->agent_id,
            'user_id' => $agent->user_id,
            'full_name' => $agent->full_name,
            'email' => $agent->email,
            'phone' => $agent->phone,
            'license_number' => $agent->license_number,
            'agency_id' => $agent->agency_id,
            'agency_name' => $agent->agency_name,
            'agency' => $agent->relationLoaded('agency') && $agent->agency ? [
                'agency_id' => $agent->agency->agency_id,
                'name' => $agent->agency->name,
                'slug' => $agent->agency->slug,
                'agency_type' => $agent->agency->agency_type,
            ] : null,
            'approval_status' => $agent->approval_status,
            'bio' => $agent->bio,
        ];
    }

    private function formatAmenity(Amenity $amenity): array
    {
        return [
            'amenity_id' => $amenity->amenity_id,
            'amenity_name' => $amenity->amenity_name,
            'amenity_category' => $amenity->amenity_category,
        ];
    }

    private function formatProperty(Property $property): array
    {
        return [
            'property_id' => $property->property_id,
            'title' => $property->title,
            'slug' => $property->slug,
            'description' => $property->description,
            'property_type' => $property->property_type,
            'price' => (float) $property->price,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'parking_spaces' => $property->parking_spaces,
            'area_sqm' => $property->area_sqm,
            'address_line' => $property->address_line,
            'city' => $property->city,
            'province' => $property->province,
            'status' => $property->status,
            'featured_image' => $this->resolveFeaturedImageUrl($property->featured_image),
            'listed_at' => optional($property->listed_at)->toIso8601String(),
            'created_at' => optional($property->created_at)->toIso8601String(),
            'inquiries_count' => $property->inquiries_count ?? null,
            'agent' => $property->relationLoaded('agent') && $property->agent
                ? $this->formatAgent($property->agent)
                : null,
            'amenities' => $property->relationLoaded('amenities')
                ? $property->amenities->map(fn (Amenity $amenity) => $this->formatAmenity($amenity))->values()
                : [],
        ];
    }

    private function formatInquiry(Inquiry $inquiry): array
    {
        return [
            'inquiry_id' => $inquiry->inquiry_id,
            'buyer_name' => $inquiry->buyer_name,
            'buyer_email' => $inquiry->buyer_email,
            'buyer_phone' => $inquiry->buyer_phone,
            'message' => $inquiry->message,
            'status' => $inquiry->status,
            'response_message' => $inquiry->response_message,
            'responded_at' => optional($inquiry->responded_at)->toIso8601String(),
            'buyer_reply' => $inquiry->buyer_reply,
            'buyer_replied_at' => optional($inquiry->buyer_replied_at)->toIso8601String(),
            'created_at' => optional($inquiry->created_at)->toIso8601String(),
            'user' => $inquiry->relationLoaded('user') && $inquiry->user ? [
                'id' => $inquiry->user->id,
                'full_name' => $inquiry->user->full_name,
                'email' => $inquiry->user->email,
            ] : null,
            'property' => $inquiry->relationLoaded('property') && $inquiry->property ? [
                'property_id' => $inquiry->property->property_id,
                'title' => $inquiry->property->title,
                'city' => $inquiry->property->city,
                'province' => $inquiry->property->province,
                'status' => $inquiry->property->status,
            ] : null,
        ];
    }

    private function formatNotification(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->data['title'] ?? 'Notification',
            'message' => $notification->data['message'] ?? '',
            'data' => $notification->data,
            'read_at' => optional($notification->read_at)->toIso8601String(),
            'created_at' => optional($notification->created_at)->toIso8601String(),
        ];
    }

    private function resolveFeaturedImageUrl(?string $path): ?string
    {
        return ImageUrlResolver::resolve($path);
    }
}
