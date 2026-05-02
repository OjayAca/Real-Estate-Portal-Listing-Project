<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use App\Services\AdminService;
use App\Services\AuthService;
use App\Services\InquiryService;
use App\Services\NotificationService;
use App\Services\PortalService;
use App\Services\PropertyService;
use App\Services\SellerLeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    public function __construct(
        private readonly PortalService $portalService,
        private readonly AuthService $authService,
        private readonly PropertyService $propertyService,
        private readonly InquiryService $inquiryService,
        private readonly AdminService $adminService,
        private readonly NotificationService $notificationService,
        private readonly SellerLeadService $sellerLeadService,
    ) {}

    public function amenitiesIndex(): JsonResponse
    {
        return $this->portalService->amenitiesIndex();
    }

    public function register(Request $request): JsonResponse
    {
        return $this->authService->register($request);
    }

    public function login(Request $request): JsonResponse
    {
        return $this->authService->login($request);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->authService->me($request);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        return $this->authService->updateProfile($request);
    }

    public function logout(Request $request): JsonResponse
    {
        return $this->authService->logout($request);
    }

    public function sendVerificationNotification(Request $request): JsonResponse
    {
        return $this->authService->sendVerificationNotification($request);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        return $this->authService->forgotPassword($request);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        return $this->authService->resetPassword($request);
    }

    public function propertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->propertiesIndex($request);
    }

    public function sellerLeadStore(Request $request): JsonResponse
    {
        return $this->sellerLeadService->store($request);
    }

    public function propertyShow(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->propertyShow($request, $property);
    }

    public function dashboard(Request $request): JsonResponse
    {
        return $this->portalService->dashboard($request);
    }

    public function notificationsIndex(Request $request): JsonResponse
    {
        return $this->notificationService->notificationsIndex($request);
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        return $this->notificationService->notificationRead($request, $notification);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        return $this->notificationService->notificationsReadAll($request);
    }

    public function savedPropertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->savedPropertiesIndex($request);
    }

    public function saveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->saveProperty($request, $property);
    }

    public function unsaveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->unsaveProperty($request, $property);
    }

    public function createInquiry(Request $request, Property $property): JsonResponse
    {
        return $this->inquiryService->createInquiry($request, $property);
    }

    public function agentPropertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->agentPropertiesIndex($request);
    }

    public function agentPropertyStore(Request $request): JsonResponse
    {
        return $this->propertyService->agentPropertyStore($request);
    }

    public function agentPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->agentPropertyUpdate($request, $property);
    }

    public function agentPropertyDestroy(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->agentPropertyDestroy($request, $property);
    }

    public function agentInquiriesIndex(Request $request): JsonResponse
    {
        return $this->inquiryService->agentInquiriesIndex($request);
    }

    public function agentInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        return $this->inquiryService->agentInquiryUpdate($request, $inquiry);
    }

    public function buyerInquiryUpdate(Request $request, Inquiry $inquiry): JsonResponse
    {
        return $this->inquiryService->buyerInquiryUpdate($request, $inquiry);
    }

    public function adminOverview(Request $request): JsonResponse
    {
        return $this->adminService->adminOverview($request);
    }

    public function adminUserUpdate(Request $request, User $user): JsonResponse
    {
        return $this->adminService->adminUserUpdate($request, $user);
    }

    public function adminAgentUpdate(Request $request, Agent $agent): JsonResponse
    {
        return $this->adminService->adminAgentUpdate($request, $agent);
    }

    public function adminPropertyUpdate(Request $request, Property $property): JsonResponse
    {
        return $this->adminService->adminPropertyUpdate($request, $property);
    }
}
