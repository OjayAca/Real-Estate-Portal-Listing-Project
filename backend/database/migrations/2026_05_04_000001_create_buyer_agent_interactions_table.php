<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buyer_agent_interactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('agents', 'agent_id')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('interaction_type', ['inquiry', 'viewing_request', 'agent_inquiry']);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'agent_id', 'interaction_type'], 'buyer_agent_interaction_unique');
            $table->index('agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buyer_agent_interactions');
    }
};
