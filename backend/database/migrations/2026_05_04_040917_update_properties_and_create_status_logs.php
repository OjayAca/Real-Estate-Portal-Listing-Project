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
        if (! Schema::hasColumn('properties', 'views_count')) {
            Schema::table('properties', function (Blueprint $table): void {
                $table->unsignedBigInteger('views_count')->default(0)->after('listed_at');
            });
        }

        // SQLite doesn't support ALTER TABLE MODIFY COLUMN, and it treats ENUM as TEXT mostly.
        // For MySQL/MariaDB, we need raw SQL to update the enum options.
        if (collect(['mysql', 'mariadb'])->contains(Illuminate\Support\Facades\DB::getDriverName())) {
            Illuminate\Support\Facades\DB::statement("ALTER TABLE properties MODIFY COLUMN status ENUM('Draft', 'Available', 'Sold', 'Rented', 'Inactive', 'Pending Sold', 'Pending Rented') DEFAULT 'Available'");
        }

        if (! Schema::hasTable('property_status_logs')) {
            Schema::create('property_status_logs', function (Blueprint $table): void {
                $table->id('status_log_id');
                $table->foreignId('property_id')->constrained('properties', 'property_id')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users', 'id')->cascadeOnDelete();
                $table->string('old_status', 50);
                $table->string('new_status', 50);
                $table->text('reason')->nullable();
                $table->timestamps();

                $table->index('property_id');
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_status_logs');

        if (collect(['mysql', 'mariadb'])->contains(Illuminate\Support\Facades\DB::getDriverName())) {
            Illuminate\Support\Facades\DB::statement("ALTER TABLE properties MODIFY COLUMN status ENUM('Draft', 'Available', 'Sold', 'Rented', 'Inactive') DEFAULT 'Available'");
        }

        if (Schema::hasColumn('properties', 'views_count')) {
            Schema::table('properties', function (Blueprint $table): void {
                $table->dropColumn('views_count');
            });
        }
    }
};
