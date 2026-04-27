<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgentPropertyImageUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_can_create_property_with_uploaded_featured_image(): void
    {
        Storage::fake('public');
        [$user, $agent] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $response = $this->post(
            '/api/agent/properties',
            [
                'title' => 'Upload Ready Listing',
                'description' => 'A listing submitted with a real featured image upload.',
                'property_type' => 'House',
                'price' => 4500000,
                'bedrooms' => 3,
                'bathrooms' => 2,
                'parking_spaces' => 1,
                'area_sqm' => 120,
                'address_line' => '123 Sample Street',
                'city' => 'Makati',
                'province' => 'Metro Manila',
                'status' => 'Available',
                'featured_image_upload' => $this->fixtureUpload('featured-image-1600x900.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertCreated();

        $property = Property::query()->firstOrFail();
        $expectedUrl = rtrim(config('app.url'), '/').'/storage/'.$property->featured_image;

        $this->assertNotNull($property->featured_image);
        $this->assertStringStartsWith("properties/agent-{$agent->agent_id}/", $property->featured_image);
        Storage::disk('public')->assertExists($property->featured_image);
        $response->assertJsonPath('data.featured_image', $expectedUrl);
    }

    public function test_uploaded_featured_images_are_resized_to_listing_target(): void
    {
        Storage::fake('public');
        [$user] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $response = $this->post(
            '/api/agent/properties',
            [
                'title' => 'Large Image Listing',
                'description' => 'A very large source image should be resized during upload.',
                'property_type' => 'House',
                'price' => 5500000,
                'address_line' => '77 Optimization Drive',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'status' => 'Available',
                'featured_image_upload' => UploadedFile::fake()->image('large.jpg', 3200, 1800),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertCreated();

        $path = Storage::disk('public')->path(Property::query()->firstOrFail()->featured_image);
        [$width, $height] = getimagesize($path);

        $this->assertSame(1600, $width);
        $this->assertSame(900, $height);
    }

    public function test_agent_property_upload_rejects_images_that_are_too_small(): void
    {
        Storage::fake('public');
        [$user] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $response = $this->post(
            '/api/agent/properties',
            [
                'title' => 'Small Image Listing',
                'description' => 'The image should fail validation because it is undersized.',
                'property_type' => 'House',
                'price' => 3500000,
                'address_line' => '45 Narrow Street',
                'city' => 'Pasig',
                'province' => 'Metro Manila',
                'status' => 'Draft',
                'featured_image_upload' => $this->fixtureUpload('featured-image-1000x600.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertStatus(422)->assertJsonValidationErrors(['featured_image_upload']);
        $this->assertDatabaseCount('properties', 0);
    }

    public function test_agent_can_replace_an_existing_uploaded_featured_image(): void
    {
        Storage::fake('public');
        [$user, $agent] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $oldPath = $this->fixtureUpload('featured-image-1600x900.png')
            ->store("properties/agent-{$agent->agent_id}", 'public');

        $property = Property::query()->create([
            'agent_id' => $agent->agent_id,
            'title' => 'Existing Listing',
            'slug' => 'existing-listing',
            'description' => 'An existing property with a stored upload.',
            'property_type' => 'House',
            'price' => 5000000,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'parking_spaces' => 2,
            'area_sqm' => 180,
            'address_line' => '88 Replacement Ave',
            'city' => 'Taguig',
            'province' => 'Metro Manila',
            'featured_image' => $oldPath,
            'status' => 'Available',
            'listed_at' => now(),
        ]);

        $response = $this->post(
            "/api/agent/properties/{$property->property_id}",
            [
                '_method' => 'PUT',
                'title' => 'Existing Listing Updated',
                'featured_image_upload' => $this->fixtureUpload('featured-image-1600x900.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertOk();

        $property->refresh();
        $expectedUrl = rtrim(config('app.url'), '/').'/storage/'.$property->featured_image;

        $this->assertNotSame($oldPath, $property->featured_image);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($property->featured_image);
        $response->assertJsonPath('data.featured_image', $expectedUrl);
    }

    public function test_agent_profile_summary_featured_images_are_resolved_to_public_urls(): void
    {
        Storage::fake('public');
        [$user, $agent] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $property = Property::query()->create([
            'agent_id' => $agent->agent_id,
            'title' => 'Summary Image Listing',
            'slug' => 'summary-image-listing',
            'description' => 'A listing that should expose a resolved image URL in agent summaries.',
            'property_type' => 'House',
            'price' => 5750000,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'parking_spaces' => 2,
            'area_sqm' => 180,
            'address_line' => '12 Summary Street',
            'city' => 'Makati',
            'province' => 'Metro Manila',
            'featured_image' => 'properties/agent-'.$agent->agent_id.'/summary-image.jpg',
            'status' => 'Available',
            'listed_at' => now(),
        ]);

        $response = $this->getJson("/api/agents/{$agent->agent_id}", ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath(
            'data.active_listings.0.featured_image',
            rtrim(config('app.url'), '/').'/storage/'.$property->featured_image
        );
    }

    /**
     * @return array{0: User, 1: Agent}
     */
    private function createApprovedAgent(): array
    {
        $user = User::factory()->create([
            'role' => UserRole::AGENT,
        ]);

        $agent = Agent::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'license_number' => 'LIC-'.strtoupper((string) fake()->bothify('####??')),
            'agency_name' => 'Test Agency',
            'approval_status' => 'approved',
            'bio' => 'Approved agent for upload testing.',
        ]);

        return [$user, $agent];
    }

    private function fixtureUpload(string $filename): UploadedFile
    {
        return new UploadedFile(
            base_path("tests/Fixtures/{$filename}"),
            $filename,
            'image/png',
            null,
            true
        );
    }
}
