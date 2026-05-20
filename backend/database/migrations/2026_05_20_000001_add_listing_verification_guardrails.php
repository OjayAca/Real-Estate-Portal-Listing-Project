<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
            $table->string('phone_verified_phone', 30)->nullable()->after('phone_verified_at');
        });

        Schema::create('mobile_otp_challenges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('phone', 30);
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'phone']);
        });

        Schema::create('property_verifications', function (Blueprint $table): void {
            $table->id('property_verification_id');
            $table->foreignId('property_id')->unique()->constrained('properties', 'property_id')->cascadeOnDelete();
            $table->string('owner_proof_type', 40)->nullable();
            $table->string('owner_proof_path')->nullable();
            $table->string('owner_proof_original_name')->nullable();
            $table->string('owner_proof_status', 30)->default('not_submitted');
            $table->text('owner_proof_notes')->nullable();
            $table->foreignId('owner_proof_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('owner_proof_reviewed_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('phone_verified_phone', 30)->nullable();
            $table->timestamp('authority_to_sell_confirmed_at')->nullable();
            $table->string('prc_license_number', 80)->nullable();
            $table->date('prc_license_expires_at')->nullable();
            $table->string('prc_verification_status', 30)->default('not_submitted');
            $table->text('prc_verification_notes')->nullable();
            $table->foreignId('prc_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('prc_reviewed_at')->nullable();
            $table->timestamp('legal_accuracy_accepted_at')->nullable();
            $table->timestamp('legal_no_duplicate_accepted_at')->nullable();
            $table->timestamp('legal_data_privacy_accepted_at')->nullable();
            $table->string('legal_terms_version', 60)->nullable();
            $table->timestamp('duplicate_checked_at')->nullable();
            $table->text('admin_review_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_verifications');
        Schema::dropIfExists('mobile_otp_challenges');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['phone_verified_at', 'phone_verified_phone']);
        });
    }
};
