<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\ViewingBooking;
use App\Services\AgentEcosystemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentEcosystemController extends Controller
{
    public function __construct(private readonly AgentEcosystemService $agentEcosystemService)
    {
    }

    public function agentsIndex(Request $request): JsonResponse
    {
        return $this->agentEcosystemService->agentsIndex($request);
    }

    public function agentShow(Request $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->agentShow($request, $agent);
    }

    public function propertyViewingSlots(Request $request, Property $property): JsonResponse
    {
        return $this->agentEcosystemService->propertyViewingSlots($request, $property);
    }

    public function bookViewing(Request $request, Property $property): JsonResponse
    {
        return $this->agentEcosystemService->bookViewing($request, $property);
    }

    public function agentAvailabilityIndex(Request $request): JsonResponse
    {
        return $this->agentEcosystemService->agentAvailabilityIndex($request);
    }

    public function agentAvailabilityUpdate(Request $request): JsonResponse
    {
        return $this->agentEcosystemService->agentAvailabilityUpdate($request);
    }

    public function agentViewingsIndex(Request $request): JsonResponse
    {
        return $this->agentEcosystemService->agentViewingsIndex($request);
    }

    public function agentViewingUpdate(Request $request, ViewingBooking $booking): JsonResponse
    {
        return $this->agentEcosystemService->agentViewingUpdate($request, $booking);
    }

    public function agentReviewStore(Request $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->agentReviewStore($request, $agent);
    }

    public function createAgentInquiry(Request $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->createAgentInquiry($request, $agent);
    }
}
