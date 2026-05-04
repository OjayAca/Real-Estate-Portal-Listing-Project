<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_searches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->json('filters');
            $table->enum('listing_purpose', ['sale', 'rent'])->default('sale');
            $table->boolean('notify_email')->default(false);
            $table->timestamp('last_notified_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'notify_email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
