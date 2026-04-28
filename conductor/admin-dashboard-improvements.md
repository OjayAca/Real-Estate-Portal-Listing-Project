# Implementation Plan - Admin Dashboard Improvements

This plan addresses two main requirements for the Admin Dashboard:
1.  **Directory System Users:** Remove the role change dropdown and display the role as static text.
2.  **Search Filters:** Add search filters for both "System Users" and "Agent Authorizations" sections to easily find records in large datasets.

## Proposed Changes

### Backend Updates

#### 1. `backend/app/Http/Controllers/Api/PortalController.php`
- Update `adminOverview()` to accept `Request $request` and pass it to the service.

#### 2. `backend/app/Services/PortalService.php`
- Update `adminOverview(Request $request)`:
    - Extract `user_search` and `agent_search` from query parameters.
    - Apply `where` clauses to the `User` query if `user_search` is provided (matching name or email).
    - Apply `where` clauses to the `Agent` query if `agent_search` is provided (matching name or agency name).
    - Increase the `take()` limit (e.g., from 10 to 50) to provide a better overview when searching.

### Frontend Updates

#### 1. `frontend/src/pages/DashboardPage.jsx`
- Add state for `userSearch` and `agentSearch`.
- Implement a debounced effect that calls the `admin/overview` endpoint with the search parameters whenever they change.
- **System Users Section:**
    - Add a search input field in the header area.
    - Replace the role `<select>` element with a static `<span>` (styled using the `.chip` class).
    - Update the suspension button's `openAdminConfirm` call to remove the `role` from the request body, as it's no longer editable here.
- **Agent Authorizations Section:**
    - Add a search input field in the header area.

## Verification Plan

### Automated Tests
- Create a new feature test `backend/tests/Feature/AdminDashboardSearchTest.php` to verify:
    - `admin/overview` returns filtered users when `user_search` is provided.
    - `admin/overview` returns filtered agents when `agent_search` is provided.
    - Admin can still suspend/restore users without changing their role.

### Manual Verification
- Log in as an Admin.
- Navigate to the Dashboard.
- **System Users Section:**
    - Verify that the role dropdown is gone and replaced by a static label.
    - Verify that the search bar works and filters the user list (debounced).
    - Verify that the "Suspend/Restore Access" button still works correctly.
- **Agent Authorizations Section:**
    - Verify that the search bar works and filters the agent list.
    - Verify that the status dropdown still works.
