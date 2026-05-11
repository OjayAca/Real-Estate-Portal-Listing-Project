<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAgentInquiryRequest;
use App\Http\Requests\StoreAgentReviewRequest;
use App\Models\Agent;
use App\Models\Property;
use App\Services\AgentEcosystemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentEcosystemController extends Controller
{
    public function __construct(private readonly AgentEcosystemService $agentEcosystemService) {}

    public function agentsIndex(Request $request): JsonResponse
    {
        return $this->agentEcosystemService->agentsIndex($request->query('search'));
    }

    public function agentShow(Request $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->agentShow($agent, $request->user());
    }

    public function agentReviewStore(StoreAgentReviewRequest $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->agentReviewStore($request->validated(), $agent, $request->user());
    }

    public function createAgentInquiry(StoreAgentInquiryRequest $request, Agent $agent): JsonResponse
    {
        return $this->agentEcosystemService->createAgentInquiry($request->validated(), $agent, $request->user());
    }
}
