<?php

namespace App\Services;

use App\Mail\AgentInquiryMail;
use App\Mail\PropertyInquiryMail;
use App\Models\Agent;
use App\Models\BuyerAgentInteraction;
use App\Models\Inquiry;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class InquiryService
{
    public function __construct(
        private readonly NotificationService $notifications,
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

        $buyerData = [
            'buyer_name' => trim((string) ($validated['buyer_name'] ?? '')) ?: $user->full_name,
            'buyer_email' => trim((string) ($validated['buyer_email'] ?? '')) ?: $user->email,
            'buyer_phone' => trim((string) ($validated['buyer_phone'] ?? '')) ?: $user->phone,
            'message' => $validated['message'],
        ];

        $inquiry = Inquiry::create([
            'buyer_id' => $user->id,
            'agent_id' => $property->agent->agent_id,
            'property_id' => $property->property_id,
            'buyer_name' => $buyerData['buyer_name'],
            'buyer_email' => $buyerData['buyer_email'],
            'buyer_phone' => $buyerData['buyer_phone'],
            'message' => $buyerData['message'],
            'status' => 'New',
        ]);

        if ($property->agent?->email) {
            Mail::to($property->agent->email)->send(new PropertyInquiryMail($property, $buyerData));
        }

        if ($property->agent?->user) {
            $this->notifications->pushNotification(
                $property->agent->user,
                'property_inquiry_received',
                'New Property Inquiry',
                "{$buyerData['buyer_name']} asked about '{$property->title}'.",
                [
                    'property_id' => $property->property_id,
                    'buyer_name' => $buyerData['buyer_name'],
                    'action_url' => '/dashboard',
                ],
            );
        }

        if ($property->agent) {
            BuyerAgentInteraction::firstOrCreate([
                'user_id' => $user->id,
                'agent_id' => $property->agent->agent_id,
                'interaction_type' => 'inquiry',
            ]);
        }

        return response()->json([
            'message' => 'Inquiry sent successfully to the agent via email.',
        ], 201);
    }

    public function createAgentInquiry(Request $request, Agent $agent): JsonResponse
    {
        if (! $agent->isApproved()) {
            return response()->json(['message' => 'This agent is not currently accepting inquiries.'], 422);
        }

        $validated = $request->validate([
            'full_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email', 'max:180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'message' => ['required', 'string', 'min:10'],
        ]);

        $user = $request->user();

        $buyerData = [
            'buyer_name' => trim((string) ($validated['full_name'] ?? '')) ?: $user->full_name,
            'buyer_email' => trim((string) ($validated['email'] ?? '')) ?: $user->email,
            'buyer_phone' => trim((string) ($validated['phone'] ?? '')) ?: $user->phone,
            'message' => $validated['message'],
        ];

        $inquiry = Inquiry::create([
            'buyer_id' => $user->id,
            'agent_id' => $agent->agent_id,
            'property_id' => null,
            'buyer_name' => $buyerData['buyer_name'],
            'buyer_email' => $buyerData['buyer_email'],
            'buyer_phone' => $buyerData['buyer_phone'],
            'message' => $buyerData['message'],
            'status' => 'New',
        ]);

        if ($agent->email) {
            Mail::to($agent->email)->send(new AgentInquiryMail($agent, $buyerData));
        }

        $agent->loadMissing('user');
        if ($agent->user) {
            $this->notifications->pushNotification(
                $agent->user,
                'agent_inquiry_received',
                'New Agent Inquiry',
                "{$buyerData['buyer_name']} sent you a message.",
                [
                    'agent_id' => $agent->agent_id,
                    'buyer_name' => $buyerData['buyer_name'],
                    'action_url' => '/dashboard',
                ],
            );
        }

        BuyerAgentInteraction::firstOrCreate([
            'user_id' => $user->id,
            'agent_id' => $agent->agent_id,
            'interaction_type' => 'agent_inquiry',
        ]);

        return response()->json([
            'message' => 'Message sent to agent successfully via email.',
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $inquiries = Inquiry::with(['property', 'agent.user'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'data' => collect($inquiries->items())->map(fn (Inquiry $i) => $this->formatInquiry($i)),
            'meta' => [
                'current_page' => $inquiries->currentPage(),
                'last_page' => $inquiries->lastPage(),
                'per_page' => $inquiries->perPage(),
                'total' => $inquiries->total(),
            ],
        ]);
    }

    public function agentIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->agent) {
            return response()->json(['message' => 'Agent profile not found.'], 404);
        }

        $inquiries = Inquiry::where('agent_id', $user->agent->agent_id)
            ->with(['property', 'agent.user'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'data' => collect($inquiries->items())->map(fn (Inquiry $i) => $this->formatInquiry($i)),
            'meta' => [
                'current_page' => $inquiries->currentPage(),
                'last_page' => $inquiries->lastPage(),
                'per_page' => $inquiries->perPage(),
                'total' => $inquiries->total(),
            ],
        ]);
    }

    public function userIndex(Request $request): JsonResponse
    {
        $inquiries = Inquiry::where('buyer_id', $request->user()->id)
            ->with(['property', 'agent.user'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'data' => collect($inquiries->items())->map(fn (Inquiry $i) => $this->formatInquiry($i)),
            'meta' => [
                'current_page' => $inquiries->currentPage(),
                'last_page' => $inquiries->lastPage(),
                'per_page' => $inquiries->perPage(),
                'total' => $inquiries->total(),
            ],
        ]);
    }

    public function agentUpdateStatus(Request $request, Inquiry $inquiry): JsonResponse
    {
        $user = $request->user();
        if (!$user->agent || $inquiry->agent_id !== $user->agent->agent_id) {
            return response()->json(['message' => 'Unauthorized or agent profile not found.'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:New,Contacted,Scheduled,Closed,Cancelled,Spam'],
        ]);

        $inquiry->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Inquiry status updated successfully.',
            'inquiry' => $this->formatInquiry($inquiry->fresh(['property', 'agent.user'])),
        ]);
    }

    /**
     * Format inquiry for response.
     */
    private function formatInquiry(Inquiry $inquiry): array
    {
        return [
            'inquiry_id' => $inquiry->inquiry_id,
            'property' => $inquiry->property ? [
                'property_id' => $inquiry->property->property_id,
                'title' => $inquiry->property->title,
                'city' => $inquiry->property->city,
                'province' => $inquiry->property->province,
                'price' => $inquiry->property->price,
            ] : null,
            'agent' => $inquiry->agent ? [
                'agent_id' => $inquiry->agent->agent_id,
                'full_name' => $inquiry->agent->user->full_name ?? 'Unknown Agent',
                'agency_name' => $inquiry->agent->agency_name,
            ] : null,
            'buyer' => [
                'user_id' => $inquiry->buyer_id,
                'name' => $inquiry->buyer_name,
                'email' => $inquiry->buyer_email,
                'phone' => $inquiry->buyer_phone,
            ],
            'message' => $inquiry->message,
            'status' => $inquiry->status,
            'created_at' => $inquiry->created_at->toDateTimeString(),
        ];
    }
}
