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
        Schema::table('seller_leads', function (Blueprint $table): void {
            $table->dropIndex(['timeline']);
            $table->dropIndex(['city', 'province']);
            
            $table->dropColumn(['address_line', 'city', 'province', 'timeline']);
            
            $table->string('property_address', 255)->after('property_type');
            $table->unsignedInteger('bedrooms')->default(0)->after('property_address');
            $table->unsignedInteger('bathrooms')->default(0)->after('bedrooms');
            $table->decimal('home_size', 10, 2)->nullable()->comment('in sqm')->after('bathrooms');
            $table->decimal('lot_size', 10, 2)->nullable()->comment('in sqm')->after('home_size');
            $table->string('condition_of_home', 100)->nullable()->after('lot_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_leads', function (Blueprint $table): void {
            $table->dropColumn(['property_address', 'bedrooms', 'bathrooms', 'home_size', 'lot_size', 'condition_of_home']);
            
            $table->string('address_line', 255)->after('property_type');
            $table->string('city', 100)->after('address_line');
            $table->string('province', 100)->after('city');
            $table->enum('timeline', ['Immediately', '1-3 months', '3-6 months', 'Just exploring'])->after('expected_price');
            
            $table->index('timeline');
            $table->index(['city', 'province']);
        });
    }
};
