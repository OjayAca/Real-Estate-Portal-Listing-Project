<?php

namespace App\Services;

use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InquiryService
{
    private const INQUIRY_STATUSES = ['New', 'Read', 'Responded', 'Closed'];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly PortalService $portal,
    ) {}

    public function createInquiry(Request $request, Property $property): JsonResponse
    {
        if ($property->status !== 'Available') {
            return response()->json(['message' => 'This property is not accepting inquiries right now.'], 422);
        }

        $validated = $request->validate([
            'buyer_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'buyer_email' => ['sometimes', 'nullable', 'email', 'max:180'],
            'buyer_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'message' => ['required', 'string', 'min:10'],
        ]);

        $user = $request->user();
        $property->loadMissing('agent.user');
        $buyerName = trim((string) ($validated['buyer_name'] ?? '')) ?: $user->full_name;
        $buyerEmail = trim((string) ($validated['buyer_email'] ?? '')) ?: $user->email;
        $buyerPhone = trim((string) ($validated['buyer_phone'] ?? '')) ?: $user->phone;

        $inquiry = Inquiry::query()->create([
            'property_id' => $property->property_id,
            'user_id' => $user->id,
            'buyer_name' => $buyerName,
            'buyer_email' => $buyerEmail,
            'buyer_phone' => $buyerPhone,
            'message' => $validated['message'],
            'status' => 'New',
        ]);

        if ($property->agent?->user) {
            $this->notifications->pushNotification(
                $property->agent->user,
                'inquiry.new',
                'New buyer inquiry',
                $buyerName.' sent an inquiry about '.$property->title.'.',
                ['property_id' => $property->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        foreach (User::query()->where('role', UserRole::ADMIN->value)->get() as $admin) {
            $this->notifications->pushNotification(
                $admin,
                'inquiry.new',
                'Inquiry received',
                'A new inquiry was submitted for '.$property->title.'.',
                ['property_id' => $property->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Inquiry sent successfully.',
            'data' => $this->portal->formatInquiry($inquiry->load(['property.agent.user', 'user'])),
        ], 201);
    }

    public function agentInquiriesIndex(Request $request): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        $inquiries = Inquiry::query()
            ->with(['property.agent.user', 'user'])
            ->whereHas('property', fn ($builder) => $builder->where('agent_id', $agent->agent_id))
            ->latest()
            ->get();

        return response()->json([
            'data' => $inquiries->map(fn (Inquiry $inquiry) => $this->portal->formatInquiry($inquiry)),
        ]);
    }

    public function agentInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        $agent = $this->portal->requireApprovedAgent($request->user());
        $inquiry->loadMissing('property.agent.user', 'user');
        $this->portal->guardOwnProperty($agent, $inquiry->property);

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
            $this->notifications->pushNotification(
                $inquiry->user,
                'inquiry.update',
                'Inquiry updated',
                'Your inquiry for '.$inquiry->property->title.' was updated to '.$inquiry->status.'.',
                ['property_id' => $inquiry->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Inquiry updated.',
            'data' => $this->portal->formatInquiry($inquiry->fresh()->load(['property.agent.user', 'user'])),
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
            $this->notifications->pushNotification(
                $inquiry->property->agent->user,
                'inquiry.reply',
                'Buyer sent a follow-up',
                $user->full_name.' replied to your response regarding '.$inquiry->property->title.'.',
                ['property_id' => $inquiry->property_id, 'inquiry_id' => $inquiry->inquiry_id]
            );
        }

        return response()->json([
            'message' => 'Your reply has been sent.',
            'data' => $this->portal->formatInquiry($inquiry->fresh()->load(['property.agent.user', 'user'])),
        ]);
    }
}
