<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Schema;

class PropertyStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $notificationType,
        private readonly string $title,
        private readonly string $message,
        private readonly array $context = []
    ) {}

    public function via(object $notifiable): array
    {
        return Schema::hasTable('notifications') ? ['database'] : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->title)
            ->line($this->message)
            ->action('View Dashboard', url('/dashboard'));
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'notification_type' => $this->notificationType,
            'title' => $this->title,
            'message' => $this->message,
        ], $this->context);
    }
}
