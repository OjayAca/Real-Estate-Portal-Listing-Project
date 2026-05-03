<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Decouple Agent Reviews from Bookings
        Schema::table('agent_reviews', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('booking_id');
        });

        // 2. Drop Legacy Communication and Booking Tables
        Schema::dropIfExists('viewing_bookings');
        Schema::dropIfExists('inquiries');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('agent_availabilities');
    }

    /**
     * Reverse the migrations (Not fully reversible since tables are dropped).
     */
    public function down(): void
    {
        // This migration is destructive and intended for a permanent architecture shift.
        // Re-creating tables here would require full schema definitions which is complex.
    }
};
