<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Services\PortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    public function __construct(private readonly PortalService $portalService)
    {
    }

    public function amenitiesIndex(): JsonResponse
    {
        return $this->portalService->amenitiesIndex();
    }

    public function register(Request $request): JsonResponse
    {
        return $this->portalService->register($request);
    }

    public function login(Request $request): JsonResponse
    {
        return $this->portalService->login($request);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->portalService->me($request);
    }

    public function logout(Request $request): JsonResponse
    {
        return $this->portalService->logout($request);
    }

    public function sendVerificationNotification(Request $request): JsonResponse
    {
        return $this->portalService->sendVerificationNotification($request);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        return $this->portalService->forgotPassword($request);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        return $this->portalService->resetPassword($request);
    }

    public function propertiesIndex(Request $request): JsonResponse
    {
        return $this->portalService->propertiesIndex($request);
    }

    public function propertyShow(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->propertyShow($request, $property);
    }

    public function dashboard(Request $request): JsonResponse
    {
        return $this->portalService->dashboard($request);
    }

    public function notificationsIndex(Request $request): JsonResponse
    {
        return $this->portalService->notificationsIndex($request);
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        return $this->portalService->notificationRead($request, $notification);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        return $this->portalService->notificationsReadAll($request);
    }

    public function savedPropertiesIndex(Request $request): JsonResponse
    {
        return $this->portalService->savedPropertiesIndex($request);
    }

    public function saveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->saveProperty($request, $property);
    }

    public function unsaveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->unsaveProperty($request, $property);
    }

    public function createInquiry(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->createInquiry($request, $property);
    }

    public function agentPropertiesIndex(Request $request): JsonResponse
    {
        return $this->portalService->agentPropertiesIndex($request);
    }

    public function agentPropertyStore(Request $request): JsonResponse
    {
        return $this->portalService->agentPropertyStore($request);
    }

    public function agentPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->agentPropertyUpdate($request, $property);
    }

    public function agentPropertyDestroy(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->agentPropertyDestroy($request, $property);
    }

    public function agentInquiriesIndex(Request $request): JsonResponse
    {
        return $this->portalService->agentInquiriesIndex($request);
    }

    public function agentInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        return $this->portalService->agentInquiryUpdate($request, $inquiry);
    }

    public function adminOverview(): JsonResponse
    {
        return $this->portalService->adminOverview();
    }

    public function adminUserUpdate(Request $request, User $user): JsonResponse
    {
        return $this->portalService->adminUserUpdate($request, $user);
    }

    public function adminAgentUpdate(Request $request, Agent $agent): JsonResponse
    {
        return $this->portalService->adminAgentUpdate($request, $agent);
    }

    public function adminPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        return $this->portalService->adminPropertyUpdate($request, $property);
    }
}
