<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminDeleteUserRequest;
use App\Http\Requests\AdminUpdateAgentStatusRequest;
use App\Http\Requests\AdminUpdatePropertyStatusRequest;
use App\Http\Requests\AdminUpdateSellerLeadRequest;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\RequestEmailUpdateRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\StoreInquiryRequest;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Requests\StoreSavedSearchRequest;
use App\Http\Requests\StoreSellerLeadRequest;
use App\Http\Requests\StoreViewingRequest;
use App\Http\Requests\UpdateInquiryStatusRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Requests\UpdatePropertyRequest;
use App\Http\Requests\UpdateSavedSearchRequest;
use App\Http\Requests\UpdateViewingRequestStatusRequest;
use App\Models\Agent;
use App\Models\Property;
use App\Models\Inquiry;
use App\Models\SavedSearch;
use App\Models\SellerLead;
use App\Models\User;
use App\Services\AdminService;
use App\Services\AuthService;
use App\Services\InquiryService;
use App\Services\NotificationService;
use App\Services\PortalService;
use App\Services\PropertyService;
use App\Services\SavedSearchService;
use App\Services\SellerLeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    public function __construct(
        private readonly PortalService $portalService,
        private readonly AuthService $authService,
        private readonly PropertyService $propertyService,
        private readonly InquiryService $inquiryService,
        private readonly AdminService $adminService,
        private readonly SellerLeadService $sellerLeadService,
        private readonly SavedSearchService $savedSearchService,
        private readonly NotificationService $notificationService,
        private readonly \App\Services\ViewingRequestService $viewingRequestService,
    ) {}

    public function amenitiesIndex(): JsonResponse
    {
        return $this->portalService->amenitiesIndex();
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        return $this->authService->register($request->validated(), $request->hasSession());
    }

    public function login(LoginRequest $request): JsonResponse
    {
        return $this->authService->login($request->validated(), $request->hasSession());
    }

    public function me(Request $request): JsonResponse
    {
        return $this->authService->me($request->user());
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        return $this->authService->updateProfile($request->validated(), $request->user());
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        return $this->authService->updatePassword($request->validated(), $request->user());
    }

    public function requestEmailUpdate(RequestEmailUpdateRequest $request): JsonResponse
    {
        return $this->authService->requestEmailUpdate($request->validated(), $request->user());
    }

    public function verifyEmailUpdate(Request $request, User $user): RedirectResponse
    {
        return $this->authService->verifyEmailUpdate($user, $request->email, $request->hasValidSignature());
    }

    public function logout(Request $request): JsonResponse
    {
        return $this->authService->logout($request->user(), $request->hasSession());
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        return $this->authService->forgotPassword($request->validated());
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        return $this->authService->resetPassword($request->validated(), $request->hasSession());
    }

    public function propertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->propertiesIndex($request->all(), $request->user());
    }

    public function sellerLeadStore(StoreSellerLeadRequest $request): JsonResponse
    {
        return $this->sellerLeadService->store($request->validated());
    }

    public function propertyShow(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->propertyShow($property, $request->user());
    }

    public function dashboard(Request $request): JsonResponse
    {
        return $this->portalService->dashboard($request->user());
    }

    public function notificationsIndex(Request $request): JsonResponse
    {
        return $this->notificationService->notificationsIndex($request->user());
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        return $this->notificationService->notificationRead($request->user(), $notification);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        return $this->notificationService->notificationsReadAll($request->user());
    }

    public function savedPropertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->savedPropertiesIndex($request->user(), $request->all());
    }

    public function saveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->saveProperty($request->user(), $property);
    }

    public function unsaveProperty(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->unsaveProperty($request->user(), $property);
    }

    public function createInquiry(StoreInquiryRequest $request, Property $property): JsonResponse
    {
        return $this->inquiryService->createInquiry($request->validated(), $property, $request->user());
    }

    public function agentPropertiesIndex(Request $request): JsonResponse
    {
        return $this->propertyService->agentPropertiesIndex($request->user());
    }

    public function agentPropertyStore(StorePropertyRequest $request): JsonResponse
    {
        return $this->propertyService->agentPropertyStore(
            $request->validated(), 
            $request->user(), 
            $request->file('featured_image_upload')
        );
    }

    public function agentPropertyUpdate(UpdatePropertyRequest $request, Property $property): JsonResponse
    {
        return $this->propertyService->agentPropertyUpdate(
            $request->validated(), 
            $property, 
            $request->user(), 
            $request->file('featured_image_upload')
        );
    }

    public function agentPropertyDestroy(Request $request, Property $property): JsonResponse
    {
        return $this->propertyService->agentPropertyDestroy($property, $request->user());
    }

    public function adminOverview(Request $request): JsonResponse
    {
        return $this->adminService->adminOverview($request);
    }

    public function adminUserUpdate(AdminUpdateUserRequest $request, User $user): JsonResponse
    {
        return $this->adminService->adminUserUpdate($request->validated(), $user);
    }

    public function adminUserDestroy(AdminDeleteUserRequest $request, User $user): JsonResponse
    {
        return $this->adminService->adminUserDestroy($request->validated(), $user);
    }

    public function adminAgentUpdate(AdminUpdateAgentStatusRequest $request, Agent $agent): JsonResponse
    {
        return $this->adminService->adminAgentUpdate($request->validated(), $agent);
    }

    public function adminPropertyUpdate(AdminUpdatePropertyStatusRequest $request, Property $property): JsonResponse
    {
        return $this->adminService->adminPropertyUpdate($request->validated(), $property, $request->user());
    }

    public function adminSellerLeadUpdate(AdminUpdateSellerLeadRequest $request, SellerLead $sellerLead): JsonResponse
    {
        return $this->adminService->adminSellerLeadUpdate($request->validated(), $sellerLead);
    }

    public function savedSearchesIndex(Request $request): JsonResponse
    {
        return $this->savedSearchService->index($request->user());
    }

    public function savedSearchStore(StoreSavedSearchRequest $request): JsonResponse
    {
        return $this->savedSearchService->store($request->validated(), $request->user());
    }

    public function savedSearchUpdate(UpdateSavedSearchRequest $request, SavedSearch $savedSearch): JsonResponse
    {
        return $this->savedSearchService->update($request->validated(), $savedSearch, $request->user());
    }

    public function savedSearchToggleAlert(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        return $this->savedSearchService->toggleAlert($savedSearch, $request->user());
    }

    public function savedSearchDestroy(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        return $this->savedSearchService->destroy($savedSearch, $request->user());
    }
    public function userInquiriesIndex(Request $request): JsonResponse
    {
        return $this->inquiryService->userIndex($request->user());
    }

    public function agentInquiriesIndex(Request $request): JsonResponse
    {
        return $this->inquiryService->agentIndex($request->user());
    }

    public function adminInquiriesIndex(Request $request): JsonResponse
    {
        return $this->inquiryService->adminIndex();
    }

    public function agentInquiryUpdate(UpdateInquiryStatusRequest $request, Inquiry $inquiry): JsonResponse
    {
        return $this->inquiryService->agentUpdateStatus($request->validated(), $inquiry, $request->user());
    }

    public function viewingRequestStore(StoreViewingRequest $request, Property $property): JsonResponse
    {
        $viewingRequest = $this->viewingRequestService->createRequest($request->validated(), $property, $request->user());
        return response()->json([
            'message' => 'Viewing request submitted successfully.',
            'viewing_request' => $viewingRequest,
        ], 201);
    }

    public function agentViewingRequestsIndex(Request $request): JsonResponse
    {
        return response()->json($this->viewingRequestService->listForAgent($request->user()));
    }

    public function agentViewingRequestUpdate(UpdateViewingRequestStatusRequest $request, \App\Models\ViewingRequest $viewingRequest): JsonResponse
    {
        // Add authorization check inside the service or here
        if ($viewingRequest->agent_id !== $request->user()->agent?->agent_id) {
            abort(403, 'Unauthorized action.');
        }

        $updatedRequest = $this->viewingRequestService->updateStatus($request->validated(), $viewingRequest);
        return response()->json([
            'message' => 'Viewing request updated successfully.',
            'viewing_request' => $updatedRequest,
        ]);
    }

    public function userViewingRequestsIndex(Request $request): JsonResponse
    {
        return response()->json($this->viewingRequestService->listForBuyer($request->user()));
    }

    public function userViewingRequestCancel(Request $request, \App\Models\ViewingRequest $viewingRequest): JsonResponse
    {
        $cancelledRequest = $this->viewingRequestService->cancelByBuyer($viewingRequest, $request->user());
        return response()->json([
            'message' => 'Viewing request cancelled successfully.',
            'viewing_request' => $cancelledRequest,
        ]);
    }
}
