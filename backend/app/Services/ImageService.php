<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Property;
use App\Support\ImageUrlResolver;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    private const FEATURED_IMAGE_TARGET_WIDTH = 1600;
    private const FEATURED_IMAGE_TARGET_HEIGHT = 900;
    private const FEATURED_IMAGE_JPEG_QUALITY = 82;
    private const FEATURED_IMAGE_WEBP_QUALITY = 82;
    private const FEATURED_IMAGE_PNG_COMPRESSION = 8;

    public function storeFeaturedImage(UploadedFile $file, Agent $agent, ?Property $existingProperty = null): string
    {
        $path = $this->optimizeAndStoreFeaturedImage($file, $agent);

        if ($existingProperty && ImageUrlResolver::isManaged($existingProperty->featured_image)) {
            Storage::disk('public')->delete($existingProperty->featured_image);
        }

        return $path;
    }

    private function optimizeAndStoreFeaturedImage(UploadedFile $file, Agent $agent): string
    {
        $sourcePath = $file->getRealPath();
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType();

        if (! $sourcePath || ! $mimeType || ! function_exists('imagecreatetruecolor')) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        }

        $sourceImage = $this->createImageResource($sourcePath, $mimeType);

        if (! $sourceImage) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        }

        try {
            $sourceImage = $this->applyExifOrientationIfNeeded($sourceImage, $sourcePath, $mimeType);

            $sourceWidth = imagesx($sourceImage);
            $sourceHeight = imagesy($sourceImage);

            if ($sourceWidth <= 0 || $sourceHeight <= 0) {
                return $file->store("properties/agent-{$agent->agent_id}", 'public');
            }

            $targetImage = $this->resizeImageResource(
                $sourceImage,
                $sourceWidth,
                $sourceHeight,
                self::FEATURED_IMAGE_TARGET_WIDTH,
                self::FEATURED_IMAGE_TARGET_HEIGHT,
                $mimeType
            );

            if (! $targetImage) {
                return $file->store("properties/agent-{$agent->agent_id}", 'public');
            }

            $extension = $this->imageExtensionForMimeType($mimeType);
            $path = "properties/agent-{$agent->agent_id}/".Str::random(40).'.'.$extension;
            $binary = $this->encodeImageResource($targetImage, $mimeType);

            Storage::disk('public')->put($path, $binary);

            if ($targetImage !== $sourceImage) {
                imagedestroy($targetImage);
            }

            return $path;
        } catch (\Throwable $e) {
            return $file->store("properties/agent-{$agent->agent_id}", 'public');
        } finally {
            if (is_resource($sourceImage) || (PHP_VERSION_ID >= 80000 && $sourceImage instanceof \GdImage)) {
                imagedestroy($sourceImage);
            }
        }
    }

    private function createImageResource(string $path, string $mimeType): mixed
    {
        return match ($mimeType) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default => false,
        };
    }

    private function applyExifOrientationIfNeeded(mixed $image, string $path, string $mimeType): mixed
    {
        if (! function_exists('exif_read_data') || ! in_array($mimeType, ['image/jpeg', 'image/jpg'], true)) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = $exif['Orientation'] ?? null;

        $rotatedImage = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };

        if ($rotatedImage !== $image) {
            imagedestroy($image);
        }

        return $rotatedImage;
    }

    private function resizeImageResource(
        mixed $sourceImage,
        int $sourceWidth,
        int $sourceHeight,
        int $targetMaxWidth,
        int $targetMaxHeight,
        string $mimeType
    ): mixed {
        $scale = min(
            $targetMaxWidth / max($sourceWidth, 1),
            $targetMaxHeight / max($sourceHeight, 1),
            1
        );

        $targetWidth = max((int) round($sourceWidth * $scale), 1);
        $targetHeight = max((int) round($sourceHeight * $scale), 1);

        if ($targetWidth === $sourceWidth && $targetHeight === $sourceHeight) {
            return $sourceImage;
        }

        $targetImage = imagecreatetruecolor($targetWidth, $targetHeight);

        if (in_array($mimeType, ['image/png', 'image/webp'], true)) {
            imagealphablending($targetImage, false);
            imagesavealpha($targetImage, true);
            $transparent = imagecolorallocatealpha($targetImage, 0, 0, 0, 127);
            imagefilledrectangle($targetImage, 0, 0, $targetWidth, $targetHeight, $transparent);
        }

        imagecopyresampled(
            $targetImage,
            $sourceImage,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight
        );

        return $targetImage;
    }

    private function encodeImageResource(mixed $image, string $mimeType): string
    {
        ob_start();

        match ($mimeType) {
            'image/jpeg', 'image/jpg' => imagejpeg($image, null, self::FEATURED_IMAGE_JPEG_QUALITY),
            'image/png' => imagepng($image, null, self::FEATURED_IMAGE_PNG_COMPRESSION),
            'image/webp' => imagewebp($image, null, self::FEATURED_IMAGE_WEBP_QUALITY),
            default => imagejpeg($image, null, self::FEATURED_IMAGE_JPEG_QUALITY),
        };

        return (string) ob_get_clean();
    }

    private function imageExtensionForMimeType(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => strtolower($mimeType),
        };
    }
}
