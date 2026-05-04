<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\PropertyStatusNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationService
{
    public function notificationsIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifications = $user->notifications()->latest()->take(50)->get();

        return response()->json([
            'data' => $notifications->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['notification_type'] ?? $n->type,
                'data' => $n->data,
                'read_at' => $n->read_at ? $n->read_at->toIso8601String() : null,
                'created_at' => $n->created_at->toIso8601String(),
            ]),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function notificationRead(Request $request, string $notificationId): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($notificationId);
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function pushNotification(User $user, string $type, string $title, string $message, array $context = []): void
    {
        $user->notify(new PropertyStatusNotification($type, $title, $message, $context));
    }
}
