<?php

namespace App\Enums;

enum UserRole: string
{
    case USER = 'user';
    case AGENT = 'agent';
    case ADMIN = 'admin';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
