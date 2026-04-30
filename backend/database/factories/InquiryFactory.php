<?php

namespace Database\Factories;

use App\Models\Inquiry;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Inquiry>
 */
class InquiryFactory extends Factory
{
    protected $model = Inquiry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $user = User::factory()->create();
        return [
            'property_id' => Property::factory(),
            'user_id' => $user->id,
            'buyer_name' => $user->full_name,
            'buyer_email' => $user->email,
            'buyer_phone' => $user->phone,
            'message' => fake()->paragraph(),
            'status' => 'New',
        ];
    }
}
