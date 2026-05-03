<?php

use App\Http\Controllers\Api\AgentEcosystemController;
use App\Http\Controllers\Api\PortalController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [PortalController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [PortalController::class, 'login'])->middleware('throttle:auth');
    Route::post('/forgot-password', [PortalController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('/reset-password', [PortalController::class, 'resetPassword'])->middleware('throttle:auth');
    Route::get('/me', [PortalController::class, 'me']);
});

Route::get('/amenities', [PortalController::class, 'amenitiesIndex']);
Route::get('/agents', [AgentEcosystemController::class, 'agentsIndex']);
Route::get('/agents/{agent}', [AgentEcosystemController::class, 'agentShow']);
Route::get('/properties', [PortalController::class, 'propertiesIndex']);
Route::get('/properties/{property}', [PortalController::class, 'propertyShow']);
Route::post('/seller-leads', [PortalController::class, 'sellerLeadStore'])->middleware('throttle:strict');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [PortalController::class, 'logout']);
    Route::patch('/auth/profile', [PortalController::class, 'updateProfile'])->middleware('throttle:strict');
    Route::get('/dashboard', [PortalController::class, 'dashboard'])->middleware(['role:agent,admin']);

    Route::middleware(['auth:sanctum', 'role:agent', 'throttle:api'])->prefix('agent')->group(function (): void {
        Route::get('/properties', [PortalController::class, 'agentPropertiesIndex']);
        Route::post('/properties', [PortalController::class, 'agentPropertyStore'])->middleware('throttle:strict');
        Route::put('/properties/{property}', [PortalController::class, 'agentPropertyUpdate'])->middleware('throttle:strict');
        Route::delete('/properties/{property}', [PortalController::class, 'agentPropertyDestroy'])->middleware('throttle:strict');
    });

    Route::middleware(['auth:sanctum', 'role:admin', 'throttle:api'])->prefix('admin')->group(function (): void {
        Route::get('/overview', [PortalController::class, 'adminOverview']);
        Route::patch('/users/{user}', [PortalController::class, 'adminUserUpdate'])->middleware('throttle:strict');
        Route::patch('/agents/{agent}', [PortalController::class, 'adminAgentUpdate'])->middleware('throttle:strict');
        Route::patch('/properties/{property}', [PortalController::class, 'adminPropertyUpdate'])->middleware('throttle:strict');
    });
});

Route::middleware(['auth:sanctum', 'role:user', 'throttle:api'])->group(function (): void {
    Route::get('/saved-properties', [PortalController::class, 'savedPropertiesIndex']);
    Route::post('/saved-properties/{property}', [PortalController::class, 'saveProperty'])->middleware('throttle:strict');
    Route::delete('/saved-properties/{property}', [PortalController::class, 'unsaveProperty'])->middleware('throttle:strict');
    Route::post('/properties/{property}/inquiries', [PortalController::class, 'createInquiry'])->middleware('throttle:strict');
    Route::post('/agents/{agent}/inquiries', [AgentEcosystemController::class, 'createAgentInquiry'])->middleware('throttle:strict');
    Route::post('/properties/{property}/viewings', [AgentEcosystemController::class, 'bookViewing'])->middleware('throttle:strict');
});

Route::middleware(['auth:sanctum', 'role:user,agent', 'throttle:api'])->group(function (): void {
    Route::post('/agents/{agent}/reviews', [AgentEcosystemController::class, 'agentReviewStore'])->middleware('throttle:strict');
});
