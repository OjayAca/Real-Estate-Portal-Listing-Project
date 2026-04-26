<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agencies', function (Blueprint $table): void {
            $table->id('agency_id');
            $table->string('name', 150)->unique();
            $table->string('slug', 180)->unique();
            $table->string('agency_type', 40)->default('Agency');
            $table->text('description')->nullable();
            $table->string('website', 255)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 180)->nullable();
            $table->timestamps();
        });

        Schema::table('agents', function (Blueprint $table): void {
            $table->foreignId('agency_id')->nullable()->after('license_number')->constrained('agencies', 'agency_id')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('agent_availabilities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['agent_id', 'day_of_week']);
        });

        Schema::create('viewing_bookings', function (Blueprint $table): void {
            $table->id('booking_id');
            $table->foreignId('property_id')->constrained('properties', 'property_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('buyer_name', 120);
            $table->string('buyer_email', 180);
            $table->string('buyer_phone', 20)->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('scheduled_start');
            $table->dateTime('scheduled_end');
            $table->enum('status', ['Pending', 'Confirmed', 'Completed', 'Cancelled'])->default('Pending');
            $table->timestamps();
            $table->index(['agent_id', 'scheduled_start']);
            $table->index(['property_id', 'scheduled_start']);
            $table->unique(['agent_id', 'scheduled_start']);
        });

        Schema::create('agent_reviews', function (Blueprint $table): void {
            $table->id('review_id');
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('viewing_bookings', 'booking_id')->nullOnDelete()->cascadeOnUpdate();
            $table->unsignedTinyInteger('rating');
            $table->text('review_text')->nullable();
            $table->timestamps();
            $table->unique(['agent_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_reviews');
        Schema::dropIfExists('viewing_bookings');
        Schema::dropIfExists('agent_availabilities');

        Schema::table('agents', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('agency_id');
        });

        Schema::dropIfExists('agencies');
    }
};
