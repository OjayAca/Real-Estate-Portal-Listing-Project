<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyVerification;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ListingVerificationService
{
    public const TERMS_VERSION = 'listing_terms_v1';

    private const SUBMISSION_STATUSES = ['Pending Review', 'Available'];

    private const DUPLICATE_STATUSES = ['Pending Review', 'Available', 'Reserved'];

    public function assertCanSubmit(
        array $data,
        User $user,
        bool $ownerMode,
        ?Property $property = null,
        ?UploadedFile $ownerProofFile = null
    ): void {
        $targetStatus = $data['status'] ?? $property?->status ?? 'Available';

        if (! $this->isSubmissionStatus($targetStatus)) {
            return;
        }

        $verification = $property?->verification;
        $errors = [];

        foreach ($this->missingLegalTerms($data, $verification) as $field => $message) {
            $errors[$field] = $message;
        }

        if ($ownerMode) {
            if (! $this->hasVerifiedPhone($user)) {
                $errors['mobile_phone'] = 'Verify your mobile number before submitting this owner listing for review.';
            }

            if (! ($data['owner_proof_type'] ?? $verification?->owner_proof_type)) {
                $errors['owner_proof_type'] = 'Choose Tax Declaration or TCT front page as proof of ownership.';
            }

            if (! $ownerProofFile && ! $verification?->owner_proof_path) {
                $errors['owner_proof_upload'] = 'Upload a Tax Declaration or TCT front page before submitting this owner listing.';
            }
        } else {
            if (! $this->truthy($data['authority_to_sell_confirmed'] ?? null) && ! $verification?->authority_to_sell_confirmed_at) {
                $errors['authority_to_sell_confirmed'] = 'Confirm that you hold a valid Authority to Sell.';
            }

            if (! ($data['prc_license_number'] ?? $verification?->prc_license_number)) {
                $errors['prc_license_number'] = 'Enter your PRC license number before submitting this listing.';
            }

            $expiry = $data['prc_license_expires_at'] ?? $verification?->prc_license_expires_at;
            if (! $expiry) {
                $errors['prc_license_expires_at'] = 'Enter your PRC license expiration date.';
            } elseif ($this->parseDate($expiry)?->lt(today())) {
                $errors['prc_license_expires_at'] = 'The PRC license expiration date must not be expired.';
            }
        }

        if ($this->hasDuplicateListing($data, $user, $ownerMode, $property)) {
            $errors['address_line'] = 'A matching active or pending listing already exists for this property.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    public function syncForProperty(
        Property $property,
        array $data,
        User $user,
        bool $ownerMode,
        ?UploadedFile $ownerProofFile = null
    ): void {
        $verification = $property->verification ?: new PropertyVerification(['property_id' => $property->property_id]);
        $updates = [];
        $now = now();

        foreach ([
            'legal_accuracy_certified' => 'legal_accuracy_accepted_at',
            'legal_no_duplicate' => 'legal_no_duplicate_accepted_at',
            'legal_data_privacy_consent' => 'legal_data_privacy_accepted_at',
        ] as $input => $column) {
            if ($this->truthy($data[$input] ?? null)) {
                $updates[$column] = $verification->{$column} ?: $now;
            }
        }

        if (isset($updates['legal_accuracy_accepted_at'], $updates['legal_no_duplicate_accepted_at'], $updates['legal_data_privacy_accepted_at'])) {
            $updates['legal_terms_version'] = self::TERMS_VERSION;
        }

        if ($ownerMode) {
            if (! empty($data['owner_proof_type'])) {
                $updates['owner_proof_type'] = $data['owner_proof_type'];
            }

            if ($ownerProofFile) {
                if ($verification->owner_proof_path) {
                    Storage::disk('local')->delete($verification->owner_proof_path);
                }

                $updates['owner_proof_path'] = $ownerProofFile->store(
                    "listing-verifications/property-{$property->property_id}",
                    'local'
                );
                $updates['owner_proof_original_name'] = $ownerProofFile->getClientOriginalName();
                $updates['owner_proof_status'] = 'pending';
                $updates['owner_proof_reviewed_by'] = null;
                $updates['owner_proof_reviewed_at'] = null;
            }

            if ($this->hasVerifiedPhone($user)) {
                $updates['phone_verified_at'] = $user->phone_verified_at;
                $updates['phone_verified_phone'] = $user->phone_verified_phone;
            }
        } else {
            if ($this->truthy($data['authority_to_sell_confirmed'] ?? null)) {
                $updates['authority_to_sell_confirmed_at'] = $verification->authority_to_sell_confirmed_at ?: $now;
            }

            $prcChanged = false;
            if (! empty($data['prc_license_number']) && $data['prc_license_number'] !== $verification->prc_license_number) {
                $updates['prc_license_number'] = $data['prc_license_number'];
                $prcChanged = true;
            }

            if (! empty($data['prc_license_expires_at'])) {
                $nextExpiry = $this->parseDate($data['prc_license_expires_at'])?->toDateString();
                if ($nextExpiry && $nextExpiry !== optional($verification->prc_license_expires_at)->toDateString()) {
                    $updates['prc_license_expires_at'] = $nextExpiry;
                    $prcChanged = true;
                }
            }

            if ($prcChanged || (! $verification->exists && ($updates['prc_license_number'] ?? null))) {
                $updates['prc_verification_status'] = 'pending';
                $updates['prc_reviewed_by'] = null;
                $updates['prc_reviewed_at'] = null;
            }
        }

        if ($this->isSubmissionStatus($property->status)) {
            $updates['duplicate_checked_at'] = $now;
        }

        if ($updates !== []) {
            $verification->fill($updates)->save();
        }
    }

    public function updateAdminReview(Property $property, User $admin, array $data): PropertyVerification
    {
        $verification = $property->verification ?: new PropertyVerification(['property_id' => $property->property_id]);
        $updates = [];

        if (array_key_exists('owner_proof_status', $data)) {
            $updates['owner_proof_status'] = $data['owner_proof_status'];
            $updates['owner_proof_reviewed_by'] = $admin->id;
            $updates['owner_proof_reviewed_at'] = now();
        }

        if (array_key_exists('owner_proof_notes', $data)) {
            $updates['owner_proof_notes'] = $data['owner_proof_notes'];
        }

        if (array_key_exists('prc_verification_status', $data)) {
            $updates['prc_verification_status'] = $data['prc_verification_status'];
            $updates['prc_reviewed_by'] = $admin->id;
            $updates['prc_reviewed_at'] = now();
        }

        if (array_key_exists('prc_verification_notes', $data)) {
            $updates['prc_verification_notes'] = $data['prc_verification_notes'];
        }

        if (array_key_exists('admin_review_notes', $data)) {
            $updates['admin_review_notes'] = $data['admin_review_notes'];
        }

        $verification->fill($updates)->save();

        return $verification->fresh();
    }

    public function approvalBlockers(Property $property): array
    {
        $property->loadMissing(['agent', 'owner', 'verification']);
        $verification = $property->verification;
        $blockers = [];

        if (! $verification) {
            return ['Listing verification details are missing.'];
        }

        if (! $this->hasAllLegalTerms($verification)) {
            $blockers[] = 'Required legal terms have not all been accepted.';
        }

        if ($property->owner_id) {
            if ($verification->owner_proof_status !== 'verified') {
                $blockers[] = 'Owner proof of ownership has not been verified.';
            }

            if (! $verification->phone_verified_at) {
                $blockers[] = 'Owner mobile number has not been verified.';
            }
        } else {
            if (! $verification->authority_to_sell_confirmed_at) {
                $blockers[] = 'Authority to Sell has not been confirmed.';
            }

            if ($verification->prc_verification_status !== 'verified') {
                $blockers[] = 'PRC license has not been manually verified.';
            }

            if (! $verification->prc_license_expires_at || $verification->prc_license_expires_at->lt(today())) {
                $blockers[] = 'PRC license expiration date is missing or expired.';
            }
        }

        if ($this->hasDuplicatePropertyRecord($property)) {
            $blockers[] = 'A matching active or pending duplicate listing exists.';
        }

        return $blockers;
    }

    public function formatVerification(?PropertyVerification $verification, ?Property $property = null): ?array
    {
        if (! $verification) {
            return null;
        }

        return [
            'owner_proof_type' => $verification->owner_proof_type,
            'owner_proof_status' => $verification->owner_proof_status,
            'owner_proof_uploaded' => (bool) $verification->owner_proof_path,
            'owner_proof_original_name' => $verification->owner_proof_original_name,
            'owner_proof_notes' => $verification->owner_proof_notes,
            'phone_verified' => (bool) $verification->phone_verified_at,
            'phone_verified_at' => optional($verification->phone_verified_at)->toIso8601String(),
            'authority_to_sell_confirmed' => (bool) $verification->authority_to_sell_confirmed_at,
            'authority_to_sell_confirmed_at' => optional($verification->authority_to_sell_confirmed_at)->toIso8601String(),
            'prc_license_number' => $verification->prc_license_number,
            'prc_license_expires_at' => optional($verification->prc_license_expires_at)->toDateString(),
            'prc_verification_status' => $verification->prc_verification_status,
            'prc_verification_notes' => $verification->prc_verification_notes,
            'legal_accuracy_accepted' => (bool) $verification->legal_accuracy_accepted_at,
            'legal_no_duplicate_accepted' => (bool) $verification->legal_no_duplicate_accepted_at,
            'legal_data_privacy_accepted' => (bool) $verification->legal_data_privacy_accepted_at,
            'legal_terms_version' => $verification->legal_terms_version,
            'duplicate_checked_at' => optional($verification->duplicate_checked_at)->toIso8601String(),
            'admin_review_notes' => $verification->admin_review_notes,
            'approval_blockers' => $property ? $this->approvalBlockers($property) : [],
        ];
    }

    public function isSubmissionStatus(?string $status): bool
    {
        return in_array($status, self::SUBMISSION_STATUSES, true);
    }

    public function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', (string) $phone) ?: '';
    }

    private function hasVerifiedPhone(User $user): bool
    {
        return $user->phone_verified_at
            && $this->normalizePhone($user->phone) !== ''
            && $this->normalizePhone($user->phone) === $this->normalizePhone($user->phone_verified_phone);
    }

    private function missingLegalTerms(array $data, ?PropertyVerification $verification): array
    {
        $required = [
            'legal_accuracy_certified' => ['column' => 'legal_accuracy_accepted_at', 'message' => 'Accept the accuracy penalty terms.'],
            'legal_no_duplicate' => ['column' => 'legal_no_duplicate_accepted_at', 'message' => 'Accept the anti-spamming and no-duplicate terms.'],
            'legal_data_privacy_consent' => ['column' => 'legal_data_privacy_accepted_at', 'message' => 'Accept the Data Privacy Act consent.'],
        ];
        $missing = [];

        foreach ($required as $field => $meta) {
            if (! $this->truthy($data[$field] ?? null) && ! $verification?->{$meta['column']}) {
                $missing[$field] = $meta['message'];
            }
        }

        return $missing;
    }

    private function hasAllLegalTerms(PropertyVerification $verification): bool
    {
        return (bool) $verification->legal_accuracy_accepted_at
            && (bool) $verification->legal_no_duplicate_accepted_at
            && (bool) $verification->legal_data_privacy_accepted_at;
    }

    private function hasDuplicateListing(array $data, User $user, bool $ownerMode, ?Property $property): bool
    {
        $candidate = [
            'address_line' => $data['address_line'] ?? $property?->address_line,
            'city' => $data['city'] ?? $property?->city,
            'province' => $data['province'] ?? $property?->province,
            'property_type' => $data['property_type'] ?? $property?->property_type,
            'listing_purpose' => $data['listing_purpose'] ?? $property?->listing_purpose,
        ];

        if (in_array(null, $candidate, true)) {
            return false;
        }

        $query = Property::query()
            ->whereIn('status', self::DUPLICATE_STATUSES)
            ->when($property, fn ($builder) => $builder->where('property_id', '!=', $property->property_id));

        if ($ownerMode) {
            $query->where('owner_id', $user->id);
        } else {
            $query->where('agent_id', $user->agent?->agent_id);
        }

        return $query->get()->contains(fn (Property $entry) => $this->sameListingFingerprint($entry, $candidate));
    }

    private function hasDuplicatePropertyRecord(Property $property): bool
    {
        $candidate = [
            'address_line' => $property->address_line,
            'city' => $property->city,
            'province' => $property->province,
            'property_type' => $property->property_type,
            'listing_purpose' => $property->listing_purpose,
        ];

        return Property::query()
            ->whereIn('status', self::DUPLICATE_STATUSES)
            ->where('property_id', '!=', $property->property_id)
            ->when($property->owner_id, fn ($builder) => $builder->where('owner_id', $property->owner_id))
            ->when($property->agent_id, fn ($builder) => $builder->where('agent_id', $property->agent_id))
            ->get()
            ->contains(fn (Property $entry) => $this->sameListingFingerprint($entry, $candidate));
    }

    private function sameListingFingerprint(Property $property, array $candidate): bool
    {
        return $this->normalizeText($property->address_line) === $this->normalizeText($candidate['address_line'])
            && $this->normalizeText($property->city) === $this->normalizeText($candidate['city'])
            && $this->normalizeText($property->province) === $this->normalizeText($candidate['province'])
            && $property->property_type === $candidate['property_type']
            && $property->listing_purpose === $candidate['listing_purpose'];
    }

    private function normalizeText(?string $value): string
    {
        return Str::of((string) $value)->lower()->replaceMatches('/[^a-z0-9]+/', '')->toString();
    }

    private function truthy(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function parseDate(mixed $value): ?CarbonInterface
    {
        if ($value instanceof CarbonInterface) {
            return $value;
        }

        try {
            return \Carbon\Carbon::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }
    }
}
