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
            $table->string('address_line', 255);
            $table->string('city', 100);
            $table->string('province', 100);
            $table->decimal('expected_price', 15, 2)->nullable();
            $table->enum('timeline', ['Immediately', '1-3 months', '3-6 months', 'Just exploring']);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('timeline');
            $table->index(['city', 'province']);
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
