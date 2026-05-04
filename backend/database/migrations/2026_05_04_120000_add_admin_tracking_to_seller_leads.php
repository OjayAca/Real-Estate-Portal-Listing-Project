<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_leads', function (Blueprint $table): void {
            $table->foreignId('assigned_agent_id')
                ->nullable()
                ->after('notes')
                ->constrained('agents', 'agent_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->enum('status', ['New', 'Contacted', 'Converted'])
                ->default('New')
                ->after('assigned_agent_id');
            $table->index('status');
            $table->index('assigned_agent_id');
        });

        DB::table('seller_leads')->whereNull('status')->update(['status' => 'New']);
    }

    public function down(): void
    {
        Schema::table('seller_leads', function (Blueprint $table): void {
            $table->dropForeign(['assigned_agent_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['assigned_agent_id']);
            $table->dropColumn(['assigned_agent_id', 'status']);
        });
    }
};
