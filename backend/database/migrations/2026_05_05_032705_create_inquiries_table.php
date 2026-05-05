<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id('inquiry_id');
            $table->foreignId('buyer_id')->constrained('users', 'id')->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->cascadeOnDelete();
            $table->foreignId('property_id')->nullable()->constrained('properties', 'property_id')->nullOnDelete();
            $table->string('buyer_name', 120);
            $table->string('buyer_email', 180);
            $table->string('buyer_phone', 20)->nullable();
            $table->text('message');
            $table->string('status', 50)->default('New');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
