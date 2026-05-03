<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyPurposeAndSellerLeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_property_index_filters_sale_and_rent_listings_separately(): void
    {
        $agent = Agent::factory()->create(['approval_status' => 'approved']);
        Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'title' => 'Sale Listing',
            'slug' => 'sale-listing',
            'listing_purpose' => 'sale',
            'status' => 'Available',
        ]);
        Property::factory()->create([
            'agent_id' => $agent->agent_id,
            'title' => 'Rental Listing',
            'slug' => 'rental-listing',
            'listing_purpose' => 'rent',
            'status' => 'Available',
        ]);

        $saleResponse = $this->getJson('/api/properties?listing_purpose=sale');
        $saleResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Sale Listing')
            ->assertJsonPath('data.0.listing_purpose', 'sale');

        $rentResponse = $this->getJson('/api/properties?listing_purpose=rent');
        $rentResponse->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Rental Listing')
            ->assertJsonPath('data.0.listing_purpose', 'rent');
    }

    public function test_agent_create_and_update_accept_valid_listing_purpose_and_reject_invalid_values(): void
    {
        [$user] = $this->createApprovedAgent();
        Sanctum::actingAs($user);

        $createResponse = $this->postJson('/api/agent/properties', [
            'title' => 'Lease Ready Condo',
            'description' => 'A rental property listing created by an approved agent.',
            'property_type' => 'Condo',
            'listing_purpose' => 'rent',
            'price' => 52000,
            'address_line' => '21 Lease Street',
            'city' => 'Taguig',
            'province' => 'Metro Manila',
            'status' => 'Available',
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.listing_purpose', 'rent');

        $property = Property::query()->firstOrFail();

        $updateResponse = $this->putJson("/api/agent/properties/{$property->property_id}", [
            'listing_purpose' => 'sale',
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.listing_purpose', 'sale');

        $invalidResponse = $this->putJson("/api/agent/properties/{$property->property_id}", [
            'listing_purpose' => 'short_term',
        ]);

        $invalidResponse->assertStatus(422)
            ->assertJsonValidationErrors(['listing_purpose']);
    }

    public function test_seller_lead_endpoint_validates_required_fields_and_stores_valid_leads(): void
    {
        $this->postJson('/api/seller-leads', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'full_name',
                'email',
                'phone',
                'property_type',
                'property_address',
                'bedrooms',
                'bathrooms',
                'condition_of_home',
            ]);

        $response = $this->postJson('/api/seller-leads', [
            'full_name' => 'Lara Santos',
            'email' => 'lara@example.com',
            'phone' => '09171234567',
            'property_type' => 'House',
            'property_address' => '18 Mango Street, Makati, Metro Manila',
            'bedrooms' => 3,
            'bathrooms' => 2,
            'home_size' => 150.5,
            'lot_size' => 240,
            'condition_of_home' => 'Good - well maintained, minor cosmetic needs',
            'expected_price' => 7200000,
            'notes' => 'Needs help pricing before listing publicly.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Seller consultation request received.');

        $this->assertDatabaseHas('seller_leads', [
            'full_name' => 'Lara Santos',
            'email' => 'lara@example.com',
            'property_type' => 'House',
            'property_address' => '18 Mango Street, Makati, Metro Manila',
            'bedrooms' => 3,
            'bathrooms' => 2,
        ]);
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
            'bio' => 'Approved agent for listing purpose testing.',
        ]);

        return [$user, $agent];
    }
}
