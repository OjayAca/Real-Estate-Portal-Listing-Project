<?php

use App\Http\Controllers\Api\AgentEcosystemController;
use App\Http\Controllers\Api\PortalController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [PortalController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [PortalController::class, 'login'])->middleware('throttle:auth');
    Route::post('/forgot-password', [PortalController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('/reset-password', [PortalController::class, 'resetPassword'])->middleware('throttle:auth');
    Route::get('/me', [PortalController::class, 'me'])->middleware('throttle:auth-session');
    Route::get('/email/verify/{user}', [PortalController::class, 'verifyEmailUpdate'])->name('auth.email.verify');
});

Route::get('/amenities', [PortalController::class, 'amenitiesIndex']);
Route::get('/agents', [AgentEcosystemController::class, 'agentsIndex']);
Route::get('/agents/{agent}', [AgentEcosystemController::class, 'agentShow']);
Route::get('/properties', [PortalController::class, 'propertiesIndex']);
Route::get('/properties/{property}', [PortalController::class, 'propertyShow']);
Route::post('/seller-leads', [PortalController::class, 'sellerLeadStore'])->middleware('throttle:strict');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [PortalController::class, 'logout']);
    Route::post('/auth/mobile-otp/request', [PortalController::class, 'requestMobileOtp'])->middleware('throttle:strict');
    Route::post('/auth/mobile-otp/verify', [PortalController::class, 'verifyMobileOtp'])->middleware('throttle:strict');
    Route::patch('/auth/profile', [PortalController::class, 'updateProfile'])->middleware('throttle:strict');
    Route::patch('/auth/password', [PortalController::class, 'updatePassword'])->middleware('throttle:strict');
    Route::patch('/auth/email', [PortalController::class, 'requestEmailUpdate'])->middleware('throttle:strict');
    Route::get('/dashboard', [PortalController::class, 'dashboard'])->middleware(['role:agent,admin']);
    Route::get('/notifications', [PortalController::class, 'notificationsIndex']);
    Route::post('/notifications/read-all', [PortalController::class, 'notificationsReadAll'])->middleware('throttle:strict');
    Route::post('/notifications/{notification}/read', [PortalController::class, 'notificationRead'])->middleware('throttle:strict');

    Route::middleware(['auth:sanctum', 'role:agent', 'throttle:api'])->prefix('agent')->group(function (): void {
        Route::get('/properties', [PortalController::class, 'agentPropertiesIndex']);
        Route::post('/properties', [PortalController::class, 'agentPropertyStore'])->middleware('throttle:strict');
        Route::put('/properties/{property}', [PortalController::class, 'agentPropertyUpdate'])->middleware('throttle:strict');
        Route::delete('/properties/{property}', [PortalController::class, 'agentPropertyDestroy'])->middleware('throttle:strict');
        Route::get('/viewing-requests', [PortalController::class, 'agentViewingRequestsIndex']);
        Route::patch('/viewing-requests/{viewingRequest}', [PortalController::class, 'agentViewingRequestUpdate'])->middleware('throttle:strict');
        Route::get('/inquiries', [PortalController::class, 'agentInquiriesIndex']);
        Route::patch('/inquiries/{inquiry}', [PortalController::class, 'agentInquiryUpdate'])->middleware('throttle:strict');
    });

    Route::middleware(['auth:sanctum', 'role:admin', 'throttle:api'])->prefix('admin')->group(function (): void {
        Route::get('/overview', [PortalController::class, 'adminOverview']);
        Route::patch('/users/{user}', [PortalController::class, 'adminUserUpdate'])->middleware('throttle:strict');
        Route::delete('/users/{user}', [PortalController::class, 'adminUserDestroy'])->middleware('throttle:strict');
        Route::patch('/agents/{agent}', [PortalController::class, 'adminAgentUpdate'])->middleware('throttle:strict');
        Route::patch('/properties/{property}', [PortalController::class, 'adminPropertyUpdate'])->middleware('throttle:strict');
        Route::patch('/properties/{property}/verification', [PortalController::class, 'adminPropertyVerificationUpdate'])->middleware('throttle:strict');
        Route::get('/properties/{property}/verification/owner-proof', [PortalController::class, 'adminPropertyVerificationDownload'])->middleware('throttle:strict');
        Route::patch('/seller-leads/{sellerLead}', [PortalController::class, 'adminSellerLeadUpdate'])->middleware('throttle:strict');
        Route::get('/inquiries', [PortalController::class, 'adminInquiriesIndex']);
    });
});

Route::middleware(['auth:sanctum', 'role:user', 'throttle:api'])->group(function (): void {
    Route::prefix('owner')->group(function (): void {
        Route::get('/properties', [PortalController::class, 'ownerPropertiesIndex']);
        Route::post('/properties', [PortalController::class, 'ownerPropertyStore'])->middleware('throttle:strict');
        Route::put('/properties/{property}', [PortalController::class, 'ownerPropertyUpdate'])->middleware('throttle:strict');
        Route::delete('/properties/{property}', [PortalController::class, 'ownerPropertyDestroy'])->middleware('throttle:strict');
        Route::get('/inquiries', [PortalController::class, 'ownerInquiriesIndex']);
        Route::patch('/inquiries/{inquiry}', [PortalController::class, 'ownerInquiryUpdate'])->middleware('throttle:strict');
        Route::get('/viewing-requests', [PortalController::class, 'ownerViewingRequestsIndex']);
        Route::patch('/viewing-requests/{viewingRequest}', [PortalController::class, 'ownerViewingRequestUpdate'])->middleware('throttle:strict');
    });

    Route::get('/saved-properties', [PortalController::class, 'savedPropertiesIndex']);
    Route::post('/saved-properties/{property}', [PortalController::class, 'saveProperty'])->middleware('throttle:strict');
    Route::delete('/saved-properties/{property}', [PortalController::class, 'unsaveProperty'])->middleware('throttle:strict');
    Route::post('/properties/{property}/inquiries', [PortalController::class, 'createInquiry'])->middleware('throttle:strict');
    Route::post('/agents/{agent}/inquiries', [AgentEcosystemController::class, 'createAgentInquiry'])->middleware('throttle:strict');
    Route::post('/properties/{property}/viewing-requests', [PortalController::class, 'viewingRequestStore'])->middleware('throttle:strict');
    Route::get('/viewing-requests', [PortalController::class, 'userViewingRequestsIndex']);
    Route::patch('/viewing-requests/{viewingRequest}/cancel', [PortalController::class, 'userViewingRequestCancel'])->middleware('throttle:strict');
    Route::get('/inquiries', [PortalController::class, 'userInquiriesIndex']);

    Route::get('/saved-searches', [PortalController::class, 'savedSearchesIndex']);
    Route::post('/saved-searches', [PortalController::class, 'savedSearchStore'])->middleware('throttle:strict');
    Route::patch('/saved-searches/{savedSearch}', [PortalController::class, 'savedSearchUpdate'])->middleware('throttle:strict');
    Route::put('/saved-searches/{savedSearch}/toggle-alert', [PortalController::class, 'savedSearchToggleAlert'])->middleware('throttle:strict');
    Route::delete('/saved-searches/{savedSearch}', [PortalController::class, 'savedSearchDestroy'])->middleware('throttle:strict');
});

Route::middleware(['auth:sanctum', 'role:user,agent', 'throttle:api'])->group(function (): void {
    Route::post('/agents/{agent}/reviews', [AgentEcosystemController::class, 'agentReviewStore'])->middleware('throttle:strict');
});
