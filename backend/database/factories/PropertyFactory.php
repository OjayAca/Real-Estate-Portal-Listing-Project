<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\Property;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Property>
 */
class PropertyFactory extends Factory
{
    protected $model = Property::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence(4);
        return [
            'agent_id' => Agent::factory(),
            'title' => $title,
            'slug' => Str::slug($title),
            'description' => fake()->paragraphs(3, true),
            'property_type' => fake()->randomElement(['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial']),
            'price' => fake()->numberBetween(1000000, 50000000),
            'bedrooms' => fake()->numberBetween(1, 5),
            'bathrooms' => fake()->numberBetween(1, 4),
            'parking_spaces' => fake()->numberBetween(0, 3),
            'area_sqm' => fake()->numberBetween(50, 500),
            'address_line' => fake()->streetAddress(),
            'city' => fake()->city(),
            'province' => fake()->state(),
            'featured_image' => null,
            'status' => 'Available',
            'listed_at' => now(),
        ];
    }
}
