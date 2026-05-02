<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Agent;
use App\Models\Amenity;
use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->create([
            'first_name' => 'System',
            'last_name' => 'Admin',
            'email' => 'admin@estateflow.test',
            'phone' => '09170000001',
            'role' => UserRole::ADMIN,
            'password' => 'password123',
            'is_active' => true,
        ]);

        $agentUsers = collect([
            [
                'first_name' => 'Mia',
                'last_name' => 'Santos',
                'email' => 'mia.agent@estateflow.test',
                'phone' => '09170000002',
                'license_number' => 'REB-2026-1001',
                'agency_name' => 'Harbor Prime Realty',
                'bio' => 'Luxury condo and townhouse specialist across Metro Manila.',
            ],
            [
                'first_name' => 'Luis',
                'last_name' => 'Cruz',
                'email' => 'luis.agent@estateflow.test',
                'phone' => '09170000003',
                'license_number' => 'REB-2026-1002',
                'agency_name' => 'Northview Estates',
                'bio' => 'Focused on family homes and lot investments.',
            ],
        ])->map(function (array $agentData): Agent {
            $user = User::query()->create([
                'first_name' => $agentData['first_name'],
                'last_name' => $agentData['last_name'],
                'email' => $agentData['email'],
                'phone' => $agentData['phone'],
                'role' => UserRole::AGENT,
                'password' => 'password123',
                'is_active' => true,
            ]);

            return Agent::query()->create([
                'user_id' => $user->id,
                'first_name' => $agentData['first_name'],
                'last_name' => $agentData['last_name'],
                'email' => $agentData['email'],
                'phone' => $agentData['phone'],
                'license_number' => $agentData['license_number'],
                'agency_name' => $agentData['agency_name'],
                'approval_status' => 'approved',
                'bio' => $agentData['bio'],
            ])->load('user');
        });

        $buyers = collect([
            User::query()->create([
                'first_name' => 'Ava',
                'last_name' => 'Reyes',
                'email' => 'ava.user@estateflow.test',
                'phone' => '09170000004',
                'role' => UserRole::USER,
                'password' => 'password123',
                'is_active' => true,
            ]),
            User::query()->create([
                'first_name' => 'Noah',
                'last_name' => 'Garcia',
                'email' => 'noah.user@estateflow.test',
                'phone' => '09170000005',
                'role' => UserRole::USER,
                'password' => 'password123',
                'is_active' => true,
            ]),
        ]);

        $amenities = collect([
            ['amenity_name' => 'Pool', 'amenity_category' => 'Recreation'],
            ['amenity_name' => 'Gym', 'amenity_category' => 'Recreation'],
            ['amenity_name' => 'Security', 'amenity_category' => 'Safety'],
            ['amenity_name' => 'Parking', 'amenity_category' => 'Convenience'],
            ['amenity_name' => 'Garden', 'amenity_category' => 'Outdoor'],
            ['amenity_name' => 'Elevator', 'amenity_category' => 'Convenience'],
            ['amenity_name' => 'Pet Area', 'amenity_category' => 'Lifestyle'],
            ['amenity_name' => 'Clubhouse', 'amenity_category' => 'Lifestyle'],
        ])->map(fn (array $entry) => Amenity::query()->create($entry));

        $properties = collect([
            [
                'agent_id' => $agentUsers[0]->agent_id,
                'title' => 'Skyline Residences Corner Condo',
                'slug' => 'skyline-residences-corner-condo',
                'description' => 'A bright two-bedroom condo with skyline views, dedicated parking, and immediate access to business districts.',
                'property_type' => 'Condo',
                'listing_purpose' => 'sale',
                'price' => 8250000,
                'bedrooms' => 2,
                'bathrooms' => 2,
                'parking_spaces' => 1,
                'area_sqm' => 82,
                'address_line' => '32 Emerald Ave, Ortigas Center',
                'city' => 'Pasig',
                'province' => 'Metro Manila',
                'featured_image' => 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Available',
                'listed_at' => now()->subDays(8),
                'amenities' => ['Pool', 'Gym', 'Security', 'Elevator'],
            ],
            [
                'agent_id' => $agentUsers[0]->agent_id,
                'title' => 'San Juan Townhouse With Roof Deck',
                'slug' => 'san-juan-townhouse-with-roof-deck',
                'description' => 'Four-level townhouse with flexible family space, roof deck entertaining area, and gated community access.',
                'property_type' => 'Townhouse',
                'listing_purpose' => 'sale',
                'price' => 15400000,
                'bedrooms' => 4,
                'bathrooms' => 3,
                'parking_spaces' => 2,
                'area_sqm' => 180,
                'address_line' => '14 Cordillera St, Greenhills',
                'city' => 'San Juan',
                'province' => 'Metro Manila',
                'featured_image' => 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Available',
                'listed_at' => now()->subDays(5),
                'amenities' => ['Parking', 'Security', 'Garden'],
            ],
            [
                'agent_id' => $agentUsers[1]->agent_id,
                'title' => 'Laguna Starter Home Near Tech Park',
                'slug' => 'laguna-starter-home-near-tech-park',
                'description' => 'Modern detached home designed for first-time buyers who want quick access to schools and business parks.',
                'property_type' => 'House',
                'listing_purpose' => 'sale',
                'price' => 6300000,
                'bedrooms' => 3,
                'bathrooms' => 2,
                'parking_spaces' => 1,
                'area_sqm' => 110,
                'address_line' => '88 Mahogany Street, Binan',
                'city' => 'Binan',
                'province' => 'Laguna',
                'featured_image' => 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Available',
                'listed_at' => now()->subDays(3),
                'amenities' => ['Parking', 'Garden', 'Clubhouse'],
            ],
            [
                'agent_id' => $agentUsers[1]->agent_id,
                'title' => 'Commercial Lot Along Bypass Road',
                'slug' => 'commercial-lot-along-bypass-road',
                'description' => 'High-visibility commercial lot ideal for fuel, retail, or logistics concepts.',
                'property_type' => 'Commercial',
                'listing_purpose' => 'sale',
                'price' => 22900000,
                'bedrooms' => 0,
                'bathrooms' => 0,
                'parking_spaces' => 0,
                'area_sqm' => 950,
                'address_line' => 'National Highway Extension',
                'city' => 'Calamba',
                'province' => 'Laguna',
                'featured_image' => 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Draft',
                'listed_at' => now()->subDays(1),
                'amenities' => ['Security'],
            ],
            [
                'agent_id' => $agentUsers[0]->agent_id,
                'title' => 'BGC Furnished Condo Near High Street',
                'slug' => 'bgc-furnished-condo-near-high-street',
                'description' => 'Fully furnished one-bedroom rental with balcony, building amenities, and walkable access to offices and dining.',
                'property_type' => 'Condo',
                'listing_purpose' => 'rent',
                'price' => 45000,
                'bedrooms' => 1,
                'bathrooms' => 1,
                'parking_spaces' => 1,
                'area_sqm' => 48,
                'address_line' => '9th Avenue, Bonifacio Global City',
                'city' => 'Taguig',
                'province' => 'Metro Manila',
                'featured_image' => 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Available',
                'listed_at' => now()->subDays(4),
                'amenities' => ['Pool', 'Gym', 'Security', 'Elevator'],
            ],
            [
                'agent_id' => $agentUsers[1]->agent_id,
                'title' => 'Alabang Family Home For Lease',
                'slug' => 'alabang-family-home-for-lease',
                'description' => 'Move-in ready house for lease with garden space, two-car parking, and quick access to schools and lifestyle centers.',
                'property_type' => 'House',
                'listing_purpose' => 'rent',
                'price' => 95000,
                'bedrooms' => 4,
                'bathrooms' => 3,
                'parking_spaces' => 2,
                'area_sqm' => 220,
                'address_line' => 'Commerce Avenue, Alabang',
                'city' => 'Muntinlupa',
                'province' => 'Metro Manila',
                'featured_image' => 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
                'status' => 'Available',
                'listed_at' => now()->subDays(2),
                'amenities' => ['Parking', 'Garden', 'Security', 'Pet Area'],
            ],
        ])->map(function (array $entry) use ($amenities): Property {
            $amenityNames = collect($entry['amenities']);
            unset($entry['amenities']);
            $property = Property::query()->create($entry);
            $property->amenities()->sync(
                $amenities->whereIn('amenity_name', $amenityNames)->pluck('amenity_id')->all()
            );
            return $property->load(['agent.user', 'amenities']);
        });

        $buyers[0]->savedProperties()->sync([$properties[0]->property_id, $properties[2]->property_id]);
        $buyers[1]->savedProperties()->sync([$properties[1]->property_id]);

        $inquiryA = Inquiry::query()->create([
            'property_id' => $properties[0]->property_id,
            'user_id' => $buyers[0]->id,
            'buyer_name' => $buyers[0]->full_name,
            'buyer_email' => $buyers[0]->email,
            'buyer_phone' => $buyers[0]->phone,
            'message' => 'I want to schedule a site visit this weekend and ask about association dues.',
            'status' => 'New',
        ]);

        $inquiryB = Inquiry::query()->create([
            'property_id' => $properties[2]->property_id,
            'user_id' => $buyers[1]->id,
            'buyer_name' => $buyers[1]->full_name,
            'buyer_email' => $buyers[1]->email,
            'buyer_phone' => $buyers[1]->phone,
            'message' => 'Please share the sample amortization and the exact turnover timeline.',
            'status' => 'Responded',
            'response_message' => 'I sent the amortization schedule to your email and we can discuss turnover options tomorrow.',
            'responded_at' => now()->subHours(5),
        ]);

        $agentUsers[0]->user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'inquiry.new',
            'data' => [
                'title' => 'New buyer inquiry',
                'message' => $buyers[0]->full_name.' asked about '.$properties[0]->title.'.',
                'inquiry_id' => $inquiryA->inquiry_id,
                'property_id' => $properties[0]->property_id,
            ],
        ]);

        $buyers[1]->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'inquiry.update',
            'data' => [
                'title' => 'Inquiry responded',
                'message' => 'Your inquiry for '.$properties[2]->title.' has a new reply from the agent.',
                'inquiry_id' => $inquiryB->inquiry_id,
                'property_id' => $properties[2]->property_id,
            ],
        ]);

        $admin->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'system.seed',
            'data' => [
                'title' => 'Demo data ready',
                'message' => 'The real estate portal demo dataset has been loaded successfully.',
            ],
        ]);
    }
}
