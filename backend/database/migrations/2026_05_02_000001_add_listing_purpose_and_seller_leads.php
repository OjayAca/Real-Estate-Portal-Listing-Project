<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            $table->enum('listing_purpose', ['sale', 'rent'])->default('sale')->after('property_type');
            $table->index('listing_purpose');
        });

        Schema::create('seller_leads', function (Blueprint $table): void {
            $table->id('seller_lead_id');
            $table->string('full_name', 120);
            $table->string('email', 180);
            $table->string('phone', 30);
            $table->enum('property_type', ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial']);
            $table->string('property_address', 255);
            $table->unsignedInteger('bedrooms')->default(0);
            $table->unsignedInteger('bathrooms')->default(0);
            $table->decimal('home_size', 10, 2)->nullable()->comment('in sqm');
            $table->decimal('lot_size', 10, 2)->nullable()->comment('in sqm');
            $table->string('condition_of_home', 100)->nullable();
            $table->decimal('expected_price', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_leads');

        Schema::table('properties', function (Blueprint $table): void {
            $table->dropIndex(['listing_purpose']);
            $table->dropColumn('listing_purpose');
        });
    }
};
