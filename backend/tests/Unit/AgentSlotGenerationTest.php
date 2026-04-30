<?php

namespace Tests\Unit;

use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use App\Models\ViewingBooking;
use App\Services\AgentEcosystemService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentSlotGenerationTest extends TestCase
{
    use RefreshDatabase;

    private AgentEcosystemService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AgentEcosystemService::class);
    }

    public function test_it_generates_30_minute_slots_within_availability(): void
    {
        $agent = Agent::factory()->create();
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);
        
        // Monday availability: 09:00 - 11:00 (4 slots: 09:00, 09:30, 10:00, 10:30)
        $agent->availabilities()->create([
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'is_active' => true,
        ]);

        $monday = Carbon::now()->next(Carbon::MONDAY);
        
        // We use reflection or just test via the public method
        $response = $this->service->propertyViewingSlots(request(), $property);
        $data = $response->getData(true);
        
        // Wait, propertyViewingSlots uses the 'date' query param
        $request = request();
        $request->merge(['date' => $monday->toDateString()]);
        
        $response = $this->service->propertyViewingSlots($request, $property);
        $slots = $response->getData(true)['data'];

        $this->assertCount(4, $slots);
        $this->assertSame('9:00 AM - 9:30 AM', $slots[0]['label']);
        $this->assertSame('10:30 AM - 11:00 AM', $slots[3]['label']);
    }

    public function test_it_excludes_slots_that_overlap_with_existing_bookings(): void
    {
        $user = User::factory()->create();
        $agent = Agent::factory()->create();
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);
        
        $agent->availabilities()->create([
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'is_active' => true,
        ]);

        $monday = Carbon::now()->next(Carbon::MONDAY);
        $startTime = $monday->copy()->setTime(10, 0, 0);
        $endTime = $monday->copy()->setTime(10, 30, 0);

        // Book the 10:00 slot
        ViewingBooking::create([
            'property_id' => $property->property_id,
            'agent_id' => $agent->agent_id,
            'user_id' => $user->id,
            'scheduled_start' => $startTime,
            'scheduled_end' => $endTime,
            'status' => 'Confirmed',
            'buyer_name' => $user->full_name,
            'buyer_email' => $user->email,
        ]);

        $request = request();
        $request->merge(['date' => $monday->toDateString()]);
        
        $response = $this->service->propertyViewingSlots($request, $property);
        $slots = $response->getData(true)['data'];

        // Should have 3 slots now (09:00, 09:30, 10:30)
        $this->assertCount(3, $slots);
        
        $slotStarts = collect($slots)->pluck('start_at')->map(fn($s) => Carbon::parse($s)->format('H:i'))->all();
        $this->assertNotContains('10:00', $slotStarts);
        $this->assertContains('09:00', $slotStarts);
        $this->assertContains('09:30', $slotStarts);
        $this->assertContains('10:30', $slotStarts);
    }

    public function test_it_excludes_past_slots_for_today(): void
    {
        $agent = Agent::factory()->create();
        $property = Property::factory()->create(['agent_id' => $agent->agent_id]);
        
        $today = Carbon::now();
        $agent->availabilities()->create([
            'day_of_week' => $today->dayOfWeek,
            'start_time' => '00:00',
            'end_time' => '23:59',
            'is_active' => true,
        ]);

        // Mock "now" to be 12:00 PM
        Carbon::setTestNow($today->copy()->setTime(12, 0, 0));

        $request = request();
        $request->merge(['date' => $today->toDateString()]);
        
        $response = $this->service->propertyViewingSlots($request, $property);
        $slots = $response->getData(true)['data'];

        foreach ($slots as $slot) {
            $this->assertTrue(Carbon::parse($slot['start_at'])->greaterThan(now()));
        }

        Carbon::setTestNow(); // Reset
    }
}
