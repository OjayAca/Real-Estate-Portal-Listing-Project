<?php

namespace App\Services;

use App\Models\ViewingRequest;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ViewingRequestService
{
    public function __construct(
        private readonly NotificationService $notificationService
    ) {}

    public function createRequest(Request $request, Property $property)
    {
        $validated = $request->validate([
            'requested_date' => 'required|date|after_or_equal:today',
            'requested_time' => 'required|date_format:H:i',
            'buyer_message' => 'nullable|string|max:1000',
        ]);

        $viewingRequest = ViewingRequest::create([
            'buyer_id' => Auth::id(),
            'agent_id' => $property->agent->user_id,
            'property_id' => $property->property_id,
            'requested_date' => $validated['requested_date'],
            'requested_time' => $validated['requested_time'],
            'buyer_message' => $validated['buyer_message'] ?? null,
            'status' => 'Pending',
        ]);

        // Notify Agent
        $agentUser = User::find($property->agent->user_id);
        if ($agentUser) {
            $this->notificationService->pushNotification(
                $agentUser,
                'viewing_request_created',
                'New Viewing Request',
                Auth::user()->full_name . " requested to view " . $property->title . " on " . $validated['requested_date'],
                ['viewing_request_id' => $viewingRequest->viewing_request_id]
            );
        }

        return $viewingRequest;
    }

    public function listForAgent(Request $request)
    {
        return ViewingRequest::with(['buyer', 'property'])
            ->where('agent_id', Auth::id())
            ->orderBy('requested_date', 'asc')
            ->orderBy('requested_time', 'asc')
            ->paginate(15);
    }

    public function listForBuyer(Request $request)
    {
        return ViewingRequest::with(['agent', 'property'])
            ->where('buyer_id', Auth::id())
            ->orderBy('requested_date', 'desc')
            ->orderBy('requested_time', 'desc')
            ->paginate(15);
    }

    public function updateStatus(Request $request, ViewingRequest $viewingRequest)
    {
        $validated = $request->validate([
            'status' => 'required|in:Confirmed,Rescheduled,Cancelled,Completed',
            'confirmed_date' => 'nullable|required_if:status,Confirmed,Rescheduled|date|after_or_equal:today',
            'confirmed_time' => 'nullable|required_if:status,Confirmed,Rescheduled|date_format:H:i',
            'agent_notes' => 'nullable|string|max:1000',
        ]);

        $viewingRequest->update($validated);

        // Notify Buyer
        $buyerUser = $viewingRequest->buyer;
        if ($buyerUser) {
            $title = "Viewing Request " . $validated['status'];
            $message = "Your viewing request for " . $viewingRequest->property->title . " has been " . strtolower($validated['status']) . " by the agent.";
            
            if ($validated['status'] === 'Rescheduled') {
                $message .= " New suggested time: " . $validated['confirmed_date'] . " at " . $validated['confirmed_time'];
            }

            $this->notificationService->pushNotification(
                $buyerUser,
                'viewing_request_updated',
                $title,
                $message,
                ['viewing_request_id' => $viewingRequest->viewing_request_id, 'status' => $validated['status']]
            );
        }

        return $viewingRequest;
    }

    public function cancelByBuyer(Request $request, ViewingRequest $viewingRequest)
    {
        // Only the buyer can cancel their own request if it's not already completed
        if ($viewingRequest->buyer_id !== Auth::id() || $viewingRequest->status === 'Completed') {
            abort(403, 'Unauthorized action.');
        }

        $viewingRequest->update(['status' => 'Cancelled']);

        // Notify Agent
        $agentUser = User::find($viewingRequest->agent_id);
        if ($agentUser) {
            $this->notificationService->pushNotification(
                $agentUser,
                'viewing_request_cancelled',
                'Viewing Request Cancelled',
                Auth::user()->full_name . " has cancelled their viewing request for " . $viewingRequest->property->title,
                ['viewing_request_id' => $viewingRequest->viewing_request_id]
            );
        }

        return $viewingRequest;
    }
}
