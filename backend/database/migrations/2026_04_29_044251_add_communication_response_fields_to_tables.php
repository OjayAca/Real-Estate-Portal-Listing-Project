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
        Schema::table('inquiries', function (Blueprint $table) {
            $table->text('buyer_reply')->nullable()->after('response_message');
            $table->timestamp('buyer_replied_at')->nullable()->after('buyer_reply');
        });

        Schema::table('viewing_bookings', function (Blueprint $table) {
            $table->text('agent_response')->nullable()->after('status');
            $table->timestamp('agent_responded_at')->nullable()->after('agent_response');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropColumn(['buyer_reply', 'buyer_replied_at']);
        });

        Schema::table('viewing_bookings', function (Blueprint $table) {
            $table->dropColumn(['agent_response', 'agent_responded_at']);
        });
    }
};
