<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('properties', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('agent_id')->constrained('users', 'id')->restrictOnDelete()->cascadeOnUpdate();
            }
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE properties MODIFY agent_id BIGINT UNSIGNED NULL');
        }

        Schema::table('inquiries', function (Blueprint $table): void {
            if (! Schema::hasColumn('inquiries', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('agent_id')->constrained('users', 'id')->cascadeOnDelete();
            }
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE inquiries MODIFY agent_id BIGINT UNSIGNED NULL');
        }

        Schema::table('viewing_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('viewing_requests', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('agent_id')->constrained('users', 'id')->cascadeOnDelete();
            }
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE viewing_requests MODIFY agent_id BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        Schema::table('viewing_requests', function (Blueprint $table): void {
            if (Schema::hasColumn('viewing_requests', 'owner_id')) {
                $table->dropConstrainedForeignId('owner_id');
            }
        });

        Schema::table('inquiries', function (Blueprint $table): void {
            if (Schema::hasColumn('inquiries', 'owner_id')) {
                $table->dropConstrainedForeignId('owner_id');
            }
        });

        Schema::table('properties', function (Blueprint $table): void {
            if (Schema::hasColumn('properties', 'owner_id')) {
                $table->dropConstrainedForeignId('owner_id');
            }
        });
    }
};
