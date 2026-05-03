<?php

namespace App\Services;

use App\Mail\StatusUpdateMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function notificationsIndex(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [],
            'unread_count' => 0,
        ]);
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function pushNotification(User $user, string $type, string $title, string $message, array $context = []): void
    {
        if ($user->email) {
            Mail::to($user->email)->send(new StatusUpdateMail($title, $message));
        }
    }
}
