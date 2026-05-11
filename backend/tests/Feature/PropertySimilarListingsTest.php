<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertySimilarListingsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that similar listings are returned in property show response.
     */
    public function test_property_show_includes_similar_listings(): void
    {
        // Current property
        $property = Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'House',
            'city' => 'Manila',
            'price' => 10000000,
        ]);

        // Similar properties (same type, purpose, city, price range)
        Property::factory()->count(3)->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'House',
            'city' => 'Manila',
            'price' => 11000000,
        ]);

        // Different type
        Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'Condo',
            'city' => 'Manila',
            'price' => 10000000,
        ]);

        // Different purpose
        Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'rent',
            'property_type' => 'House',
            'city' => 'Manila',
            'price' => 50000,
        ]);

        $response = $this->getJson("/api/properties/{$property->property_id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'similar_properties',
            ])
            ->assertJsonCount(4, 'similar_properties');

        // Check that the current property is NOT in the similar properties
        $similarIds = collect($response->json('similar_properties'))->pluck('property_id');
        $this->assertNotContains($property->property_id, $similarIds->toArray());

        // Verify that the first 3 are the exact matches (same type)
        $similarTypes = collect($response->json('similar_properties'))->pluck('property_type');
        $this->assertEquals('House', $similarTypes[0]);
        $this->assertEquals('House', $similarTypes[1]);
        $this->assertEquals('House', $similarTypes[2]);
    }

    /**
     * Test similarity fallback logic.
     */
    public function test_property_show_similar_listings_fallback(): void
    {
         // Current property
         $property = Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'House',
            'city' => 'Manila',
            'price' => 10000000,
        ]);

        // Only 1 exact match in same city/price
        Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'House',
            'city' => 'Manila',
            'price' => 11000000,
        ]);

        // 2 matches in different city but same type/purpose
        Property::factory()->count(2)->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'House',
            'city' => 'Quezon City',
            'price' => 15000000,
        ]);

        // 1 match with different type but same purpose
        Property::factory()->create([
            'status' => 'Available',
            'listing_purpose' => 'sale',
            'property_type' => 'Condo',
            'city' => 'Manila',
            'price' => 8000000,
        ]);

        $response = $this->getJson("/api/properties/{$property->property_id}");

        $response->assertStatus(200)
            ->assertJsonCount(4, 'similar_properties');
    }
}
