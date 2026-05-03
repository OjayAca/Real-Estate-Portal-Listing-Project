<?php

namespace App\Services;

use App\Mail\AgentInquiryMail;
use App\Mail\PropertyInquiryMail;
use App\Models\Agent;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class InquiryService
{
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

        if ($property->agent?->email) {
            Mail::to($property->agent->email)->send(new PropertyInquiryMail($property, $buyerData));
        }

        return response()->json([
            'message' => 'Inquiry sent successfully to the agent via email.',
        ], 201);
    }

    public function createAgentInquiry(Request $request, Agent $agent): JsonResponse
    {
        if (!$agent->isApproved()) {
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

        if ($agent->email) {
            Mail::to($agent->email)->send(new AgentInquiryMail($agent, $buyerData));
        }

        return response()->json([
            'message' => 'Message sent to agent successfully via email.',
        ], 201);
    }
}
