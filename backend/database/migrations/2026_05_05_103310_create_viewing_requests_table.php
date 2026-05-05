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
        Schema::create('viewing_requests', function (Blueprint $table) {
            $table->id('viewing_request_id');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('agent_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('property_id')->references('property_id')->on('properties')->onDelete('cascade');
            $table->date('requested_date');
            $table->time('requested_time');
            $table->date('confirmed_date')->nullable();
            $table->time('confirmed_time')->nullable();
            $table->enum('status', ['Pending', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed'])->default('Pending');
            $table->text('buyer_message')->nullable();
            $table->text('agent_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('viewing_requests');
    }
};
