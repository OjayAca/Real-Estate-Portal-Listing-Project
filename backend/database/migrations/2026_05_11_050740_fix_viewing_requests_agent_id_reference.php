<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Data Migration: Update current agent_id (User ID) to Agent ID
        // We use a subquery or loop for portability (especially for SQLite tests)
        $viewingRequests = DB::table('viewing_requests')->get();
        foreach ($viewingRequests as $vr) {
            $agent = DB::table('agents')->where('user_id', $vr->agent_id)->first();
            if ($agent) {
                DB::table('viewing_requests')
                    ->where('viewing_request_id', $vr->viewing_request_id)
                    ->update(['agent_id' => $agent->agent_id]);
            }
        }

        // 2. Schema Migration: Update the foreign key constraint
        Schema::table('viewing_requests', function (Blueprint $table) {
            // SQLite doesn't support dropping foreign keys easily in some versions,
            // but Laravel's dropForeign handles it by recreating the table if needed.
            $table->dropForeign(['agent_id']);
            $table->foreign('agent_id')->references('agent_id')->on('agents')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('viewing_requests', function (Blueprint $table) {
            $table->dropForeign(['agent_id']);
        });

        // Data migration back: Update Agent ID to User ID
        $viewingRequests = DB::table('viewing_requests')->get();
        foreach ($viewingRequests as $vr) {
            $agent = DB::table('agents')->where('agent_id', $vr->agent_id)->first();
            if ($agent) {
                DB::table('viewing_requests')
                    ->where('viewing_request_id', $vr->viewing_request_id)
                    ->update(['agent_id' => $agent->user_id]);
            }
        }

        Schema::table('viewing_requests', function (Blueprint $table) {
            $table->foreign('agent_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
