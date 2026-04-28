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

        // If the URL returned by Storage is already absolute and valid, 
        // we check if it's a localhost/127.0.0.1 URL that might need port correction.
        if (filter_var($url, FILTER_VALIDATE_URL)) {
            $host = parse_url($url, PHP_URL_HOST);
            if (in_array($host, ['localhost', '127.0.0.1'], true) && app()->bound('request')) {
                $requestHost = request()->getHost();
                $requestPort = request()->getPort();
                $urlPort = parse_url($url, PHP_URL_PORT);

                if (($host !== $requestHost || (string) $urlPort !== (string) $requestPort) && $requestHost) {
                    $url = Str::replaceFirst(
                        $host . ($urlPort ? ':' . $urlPort : ''),
                        $requestHost . ($requestPort && !in_array($requestPort, [80, 443]) ? ':' . $requestPort : ''),
                        $url
                    );
                }
            }
            return $url;
        }

        $baseUrl = app()->bound('request') && request()->root()
            ? rtrim(request()->root(), '/')
            : rtrim(config('app.url', 'http://localhost'), '/');

        return $baseUrl . '/' . ltrim($url, '/');
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
