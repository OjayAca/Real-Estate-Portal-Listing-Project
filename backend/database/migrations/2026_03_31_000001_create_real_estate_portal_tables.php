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
        Schema::create('agents', function (Blueprint $table): void {
            $table->id('agent_id');
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 180)->unique();
            $table->string('phone', 20);
            $table->string('license_number', 50)->unique();
            $table->string('agency_name', 150)->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'suspended'])->default('pending');
            $table->text('bio')->nullable();
            $table->timestamps();
        });

        Schema::create('amenities', function (Blueprint $table): void {
            $table->id('amenity_id');
            $table->string('amenity_name', 100)->unique();
            $table->string('amenity_category', 60)->nullable();
            $table->timestamps();
        });

        Schema::create('properties', function (Blueprint $table): void {
            $table->id('property_id');
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('title', 150);
            $table->string('slug', 180)->unique();
            $table->text('description');
            $table->enum('property_type', ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'])->default('House');
            $table->decimal('price', 15, 2);
            $table->unsignedTinyInteger('bedrooms')->default(0);
            $table->unsignedTinyInteger('bathrooms')->default(0);
            $table->unsignedTinyInteger('parking_spaces')->default(0);
            $table->unsignedInteger('area_sqm')->nullable();
            $table->string('address_line', 255);
            $table->string('city', 100);
            $table->string('province', 100);
            $table->string('featured_image')->nullable();
            $table->enum('status', ['Draft', 'Available', 'Sold', 'Rented', 'Inactive', 'Pending Sold', 'Pending Rented'])->default('Available');
            $table->timestamp('listed_at')->nullable();
            $table->timestamps();
            $table->index('city');
            $table->index('status');
            $table->index('price');
        });

        Schema::create('property_amenities', function (Blueprint $table): void {
            $table->foreignId('property_id')->constrained('properties', 'property_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('amenity_id')->constrained('amenities', 'amenity_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->primary(['property_id', 'amenity_id']);
            $table->index('amenity_id');
        });

        Schema::create('inquiries', function (Blueprint $table): void {
            $table->id('inquiry_id');
            $table->foreignId('property_id')->constrained('properties', 'property_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('buyer_name', 120);
            $table->string('buyer_email', 180);
            $table->string('buyer_phone', 20)->nullable();
            $table->text('message');
            $table->enum('status', ['New', 'Read', 'Responded', 'Closed'])->default('New');
            $table->text('response_message')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiries');
        Schema::dropIfExists('property_amenities');
        Schema::dropIfExists('properties');
        Schema::dropIfExists('amenities');
        Schema::dropIfExists('agents');
    }
};
