<?php

namespace Tests\Unit;

use App\Support\ImageUrlResolver;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageUrlResolverTest extends TestCase
{
    public function test_it_returns_null_for_empty_path(): void
    {
        $this->assertNull(ImageUrlResolver::resolve(null));
        $this->assertNull(ImageUrlResolver::resolve(''));
    }

    public function test_it_returns_full_urls_as_is(): void
    {
        $url = 'https://example.com/image.jpg';
        $this->assertSame($url, ImageUrlResolver::resolve($url));
    }

    public function test_it_returns_data_urls_as_is(): void
    {
        $url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        $this->assertSame($url, ImageUrlResolver::resolve($url));
    }

    public function test_it_resolves_local_paths_to_storage_urls(): void
    {
        Storage::fake('public');
        $path = 'properties/agent-1/test.jpg';

        $resolved = ImageUrlResolver::resolve($path);

        $this->assertStringContainsString('/storage/'.$path, $resolved);
    }

    public function test_it_strips_storage_prefix_if_present(): void
    {
        Storage::fake('public');
        $path = 'storage/properties/agent-1/test.jpg';

        $resolved = ImageUrlResolver::resolve($path);

        $this->assertStringContainsString('/properties/agent-1/test.jpg', $resolved);
        $this->assertStringNotContainsString('/storage/storage/', $resolved);
    }

    public function test_it_identifies_managed_paths(): void
    {
        $this->assertTrue(ImageUrlResolver::isManaged('properties/test.jpg'));
        $this->assertTrue(ImageUrlResolver::isManaged('storage/properties/test.jpg'));
        $this->assertTrue(ImageUrlResolver::isManaged('/properties/test.jpg'));

        $this->assertFalse(ImageUrlResolver::isManaged(null));
        $this->assertFalse(ImageUrlResolver::isManaged('other/test.jpg'));
        $this->assertFalse(ImageUrlResolver::isManaged('https://example.com/test.jpg'));
    }
}
