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
        Schema::table('agents', function (Blueprint $table): void {
            $table->dropUnique('agents_license_number_unique');
            $table->string('dhsud_registration_number', 80)->nullable()->after('license_number');
            $table->string('profile_picture')->nullable()->after('dhsud_registration_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            $table->dropColumn(['dhsud_registration_number', 'profile_picture']);
            $table->unique('license_number');
        });
    }
};
