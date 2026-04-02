<?php

use App\Http\Controllers\Api\PortalController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [PortalController::class, 'register']);
    Route::post('/login', [PortalController::class, 'login']);
});

Route::get('/amenities', [PortalController::class, 'amenitiesIndex']);
Route::get('/properties', [PortalController::class, 'propertiesIndex']);
Route::get('/properties/{property}', [PortalController::class, 'propertyShow']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [PortalController::class, 'me']);
    Route::post('/auth/logout', [PortalController::class, 'logout']);
    Route::get('/dashboard', [PortalController::class, 'dashboard']);
    Route::get('/notifications', [PortalController::class, 'notificationsIndex']);
    Route::patch('/notifications/{notification}/read', [PortalController::class, 'notificationRead']);
    Route::post('/notifications/read-all', [PortalController::class, 'notificationsReadAll']);

    Route::middleware('role:user')->group(function (): void {
        Route::get('/saved-properties', [PortalController::class, 'savedPropertiesIndex']);
        Route::post('/saved-properties/{property}', [PortalController::class, 'saveProperty']);
        Route::delete('/saved-properties/{property}', [PortalController::class, 'unsaveProperty']);
        Route::post('/properties/{property}/inquiries', [PortalController::class, 'createInquiry']);
    });

    Route::prefix('agent')->middleware('role:agent')->group(function (): void {
        Route::get('/properties', [PortalController::class, 'agentPropertiesIndex']);
        Route::post('/properties', [PortalController::class, 'agentPropertyStore']);
        Route::put('/properties/{property}', [PortalController::class, 'agentPropertyUpdate']);
        Route::delete('/properties/{property}', [PortalController::class, 'agentPropertyDestroy']);
        Route::get('/inquiries', [PortalController::class, 'agentInquiriesIndex']);
        Route::patch('/inquiries/{inquiry}', [PortalController::class, 'agentInquiryUpdate']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/overview', [PortalController::class, 'adminOverview']);
        Route::patch('/users/{user}', [PortalController::class, 'adminUserUpdate']);
        Route::patch('/agents/{agent}', [PortalController::class, 'adminAgentUpdate']);
        Route::patch('/properties/{property}', [PortalController::class, 'adminPropertyUpdate']);
    });
});
