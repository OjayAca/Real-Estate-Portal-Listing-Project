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
        Schema::table('inquiries', function (Blueprint $table): void {
            $table->foreignId('property_id')->nullable()->change();
            $table->foreignId('agent_id')->nullable()->after('property_id')->constrained('agents', 'agent_id')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inquiries', function (Blueprint $table): void {
            $table->dropForeign(['agent_id']);
            $table->dropColumn('agent_id');
            $table->foreignId('property_id')->nullable(false)->change();
        });
    }
};
