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
            $table->unsignedInteger('year_built')->nullable()->after('property_type');
            $table->unsignedInteger('partial_bathrooms')->default(0)->after('bathrooms');
            $table->decimal('mortgage_balance', 15, 2)->nullable()->after('expected_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_leads', function (Blueprint $table): void {
            $table->dropColumn(['year_built', 'partial_bathrooms', 'mortgage_balance']);
        });
    }
};
