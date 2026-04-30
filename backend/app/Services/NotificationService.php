<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

class NotificationService
{
    use FormatsResources;

    public function notificationsIndex(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->latest()->take(25)->get();

        return response()->json([
            'data' => $notifications->map(fn (DatabaseNotification $notification) => $this->formatNotification($notification)),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function notificationRead(Request $request, string $notification): JsonResponse
    {
        $entry = $request->user()->notifications()->whereKey($notification)->firstOrFail();
        $entry->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->formatNotification($entry->fresh()),
        ]);
    }

    public function notificationsReadAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function pushNotification(User $user, string $type, string $title, string $message, array $context = []): void
    {
        $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'data' => array_merge([
                'title' => $title,
                'message' => $message,
            ], $context),
        ]);
    }

    public function formatNotification(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->data['title'] ?? 'Notification',
            'message' => $notification->data['message'] ?? '',
            'data' => $notification->data,
            'read_at' => optional($notification->read_at)->toIso8601String(),
            'created_at' => optional($notification->created_at)->toIso8601String(),
        ];
    }
}
