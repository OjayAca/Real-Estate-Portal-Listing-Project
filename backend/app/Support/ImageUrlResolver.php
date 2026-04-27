<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUrlResolver
{
    public static function resolve(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL) || Str::startsWith($path, ['//', 'data:'])) {
            return $path;
        }

        $normalized = ltrim($path, '/');

        if (Str::startsWith($normalized, 'storage/')) {
            $normalized = Str::after($normalized, 'storage/');
        }

        $url = Storage::disk('public')->url($normalized);

        if (filter_var($url, FILTER_VALIDATE_URL) || Str::startsWith($url, ['//', 'data:'])) {
            return $url;
        }

        $baseUrl = app()->bound('request') && request()->root()
            ? rtrim(request()->root(), '/')
            : rtrim(config('app.url'), '/');

        return $baseUrl.'/'.ltrim($url, '/');
    }

    public static function isManaged(?string $path): bool
    {
        if (! $path) {
            return false;
        }

        $normalized = ltrim($path, '/');

        if (Str::startsWith($normalized, 'storage/')) {
            $normalized = Str::after($normalized, 'storage/');
        }

        return Str::startsWith($normalized, 'properties/');
    }
}
