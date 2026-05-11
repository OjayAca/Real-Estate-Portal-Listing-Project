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

    public function createRequest(array $data, Property $property, User $user)
    {
        $viewingRequest = ViewingRequest::create([
            'buyer_id' => $user->id,
            'agent_id' => $property->agent_id,
            'property_id' => $property->property_id,
            'requested_date' => $data['requested_date'],
            'requested_time' => $data['requested_time'],
            'buyer_message' => $data['buyer_message'] ?? null,
            'status' => 'Pending',
        ]);

        // Notify Agent
        $agentUser = $property->agent->user;
        if ($agentUser) {
            $this->notificationService->pushNotification(
                $agentUser,
                'viewing_request_created',
                'New Viewing Request',
                $user->full_name . " requested to view " . $property->title . " on " . $data['requested_date'],
                ['viewing_request_id' => $viewingRequest->viewing_request_id]
            );
        }

        return $viewingRequest;
    }

    public function listForAgent(User $user)
    {
        return ViewingRequest::with(['buyer', 'property'])
            ->where('agent_id', $user->agent->agent_id)
            ->orderBy('requested_date', 'asc')
            ->orderBy('requested_time', 'asc')
            ->paginate(15);
    }

    public function listForBuyer(User $user)
    {
        return ViewingRequest::with(['agent.user', 'property'])
            ->where('buyer_id', $user->id)
            ->orderBy('requested_date', 'desc')
            ->orderBy('requested_time', 'desc')
            ->paginate(15);
    }

    public function updateStatus(array $data, ViewingRequest $viewingRequest)
    {
        $viewingRequest->update($data);

        // Notify Buyer
        $buyerUser = $viewingRequest->buyer;
        if ($buyerUser) {
            $title = "Viewing Request " . $data['status'];
            $message = "Your viewing request for " . $viewingRequest->property->title . " has been " . strtolower($data['status']) . " by the agent.";
            
            if ($data['status'] === 'Rescheduled') {
                $message .= " New suggested time: " . ($data['confirmed_date'] ?? 'N/A') . " at " . ($data['confirmed_time'] ?? 'N/A');
            }

            $this->notificationService->pushNotification(
                $buyerUser,
                'viewing_request_updated',
                $title,
                $message,
                ['viewing_request_id' => $viewingRequest->viewing_request_id, 'status' => $data['status']]
            );
        }

        return $viewingRequest;
    }

    public function cancelByBuyer(ViewingRequest $viewingRequest, User $user)
    {
        // Only the buyer can cancel their own request if it's not already completed
        if ($viewingRequest->buyer_id !== $user->id || $viewingRequest->status === 'Completed') {
            abort(403, 'Unauthorized action.');
        }

        $viewingRequest->update(['status' => 'Cancelled']);

        // Notify Agent
        $agentUser = $viewingRequest->agent->user;
        if ($agentUser) {
            $this->notificationService->pushNotification(
                $agentUser,
                'viewing_request_cancelled',
                'Viewing Request Cancelled',
                $user->full_name . " has cancelled their viewing request for " . $viewingRequest->property->title,
                ['viewing_request_id' => $viewingRequest->viewing_request_id]
            );
        }

        return $viewingRequest;
    }
}
