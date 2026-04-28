# Implementation Plan - Fix Property Image Display and General Review

This plan addresses the issue where property images do not show after an agent adds a property, and includes a general review of the codebase for potential issues.

## Problem Analysis
1. **Image Display Issue**: The `ImageUrlResolver` generates URLs that may mismatch the actual server port if `APP_URL` is incorrectly set. Specifically, if `APP_URL` is `http://localhost` but the server runs on `http://localhost:8000`, `Storage::disk('public')->url()` returns a URL with the wrong port.
2. **Listed Date Inconsistency**: Properties are marked as "listed" immediately upon creation even if they are in `Draft` status.
3. **Image Optimization Robustness**: If the GD extension is missing or fails, the fallback logic is okay but could be clearer.

## Proposed Changes

### 1. Backend: Image URL Resolution
- Modify `app/Support/ImageUrlResolver.php` to:
    - Prioritize `request()->root()` for local storage paths to ensure the host and port match the current environment.
    - Handle cases where `Storage::url()` returns relative paths more consistently.

### 2. Backend: Property Management (PortalService)
- Modify `app/Services/PortalService.php`:
    - In `agentPropertyStore`, only set `listed_at` if the status is `Available`.
    - In `agentPropertyUpdate`, if the status changes from `Draft` to `Available` and `listed_at` is null, set `listed_at` to `now()`.
    - Ensure `featured_image` is handled correctly when no image is uploaded during creation (it should be null).

### 3. General Codebase Review & Fixes
- **Agency Syncing**: Ensure `syncNamedAgencies` in `AgentEcosystemService` doesn't overwrite existing `agency_id` if it's already set (already mostly handled but will double-check).
- **Redundant Assignments**: Clean up some redundant `forceFill` or similar calls if found.
- **Validation**: Ensure propertySpec validation in `PortalService` matches the requirements.

## Verification Plan

### Automated Tests
- Run existing tests: `php artisan test tests/Feature/AgentPropertyImageUploadTest.php`
- Add a new test case to verify `listed_at` logic in `PortalService`.
- Verify `ImageUrlResolver` with different `APP_URL` configurations (mocking config).

### Manual Verification
1. Log in as an agent.
2. Create a new property with an image as `Draft`.
    - Verify `listed_at` is null.
    - Verify image URL is correct and shows in the dashboard.
3. Update the property to `Available`.
    - Verify `listed_at` is set.
4. View the property on the public catalog.
    - Verify the image shows correctly.
