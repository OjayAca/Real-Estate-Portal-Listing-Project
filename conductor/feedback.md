1. Authentication & Authorization — Backend

CRITICAL: Agent & Admin Routes Missing auth:sanctum Middleware

In routes/api.php, the agent and admin route groups only apply role:agent / role:admin middleware, but not auth:sanctum:

Current:
Route::prefix('agent')->middleware('role:agent')->group(...);
Route::prefix('admin')->middleware('role:admin')->group(...);

EnsureRole checks $request->user(), which returns null for unauthenticated token-based requests without auth:sanctum.

Correct form:
Route::middleware(['auth:sanctum', 'role:agent'])->prefix('agent')->group(...);
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(...);

Without this, unauthenticated requests return 403 Forbidden instead of the correct 401 Unauthorized, and Bearer token auth will not work reliably on these routes.

Unapproved Agent Can Access Dashboard

The backend correctly returns HTTP 403 for GET /dashboard when an agent is pending or suspended through requireApprovedAgent. However, the frontend catches the 403 and silently creates a fallback dashboard.

If an admin approves the agent while they are logged in, the approval_status in the user object is stale until re-login or page refresh. There is no mechanism to re-fetch the user profile after a notification about status change.

GET /auth/me — No Auth Required

The /auth/me endpoint has no auth:sanctum middleware and returns { user: null } for guests. This is intentional for the SPA's initial auth check. No issue here, but it is worth documenting.

Admin Can Promote a User to Agent Without an Agent Profile

In adminUserUpdate, there is a guard that prevents promoting a user to agent if the user has no agent profile. However, the reverse is not guarded. An admin can demote an agent who has active listings to a plain user role. Their agent_id still owns those properties, and requireApprovedAgent would then fail because the agent profile is technically orphaned in terms of role. The properties remain visible on the public portal with no owner who can manage them.

2. Business Logic Issues

CRITICAL UX BUG: "Book Viewing" on Property Card Does Not Open Drawer

In PropertiesPage.jsx, the bookViewing function is passed as onInquire to PropertyCard.

When a user clicks "Book Viewing" on a card, bookViewing(property) runs immediately, hits the !selectedSlot guard, and shows the error "Choose a viewing slot first" without opening the property drawer where slots are displayed.

The intended flow should be:
1. Click the card to open the drawer.
2. Pick a date or slot.
3. Click "Book Viewing Slot."

Fix:
In PropertyCard, onInquire should open the detail drawer, not call bookViewing directly.

Example:
onInquire={canUseBuyerActions ? (property) => setSelected(property) : null}

The actual booking call inside the drawer is already wired correctly.

Inquiry System Exists on Backend but Has No Buyer UI

The backend has a full inquiry workflow:
- POST /properties/{property}/inquiries
- Status tracking: New, Responded, Closed
- Agent response messages
- Notifications to agents and admins
- Agent inquiry dashboard

However, buyers have no UI to submit an inquiry. They can only book viewings. The PropertyCard calls onInquire, but in practice this is wired to the viewing booker, not an inquiry form.

This means the entire inquiry system is invisible to buyers. Either the inquiry UI should be added, or the backend endpoints should be cleaned up.

Agent Can Update Inquiry Status to "Closed" Without a Response Message

In agentInquiryUpdate, an agent can set the status to Closed without entering a response_message. The responded_at value gets set, making it look like the inquiry was answered. There should be validation requiring a response message when status is Responded or Closed.

Stale featured_image After Property Update Without New Upload

When editing a property without touching the image, featured_image keeps the existing URL string. If a new file is uploaded, the old one is deleted and the new path is stored.

However, if the field contains an external URL from the seeder and a new file is uploaded, isManaged returns false for the old URL, so the old file is not deleted. This is correct behavior, but external seeded URLs will never be cleaned up.

SavedProperty Model Does Not Exist

The User model declares a savedProperties relationship with a PHPDoc type hint referencing SavedProperty, but there is no App\Models\SavedProperty class.

The saved_properties table exists, but there is no corresponding Eloquent model. This may cause PHPStan or IDE errors.

3. Security Concerns

No Rate Limiting on State-Changing Endpoints

Only throttle:auth and throttle:verification-notification are configured.

There is no rate limiting on:
- Property creation, update, and delete
- Viewing bookings
- Agent review submission
- Admin user and property updates
- Saved properties

A buyer could loop-submit viewings or reviews. The unique constraint on agent_id and scheduled_start prevents duplicate bookings but does not prevent enumeration attacks.

Token Returned on Login/Register but Never Used

The API returns a Sanctum token on login/register, but the frontend never stores or sends this token. It relies entirely on session cookies with credentials: include.

The issued token persists in personal_access_tokens forever because no expiry is set. This creates token accumulation and possible token leakage.

Fix:
Either store and use the token properly, or stop issuing it. Since session-based auth is working, token issuance should be removed or expiration should be configured.

Password Reset Flow Redirects to Frontend Correctly

The password.reset named route redirects to FRONTEND_URL/login?token=....

The resetPassword method in PortalService correctly uses PasswordBroker::reset. The email verification route also redirects correctly. No issue here.

4. Role Behavior Matrix Review

Guest:
- Browse properties: Yes
- Save a property: No
- Book a viewing: No
- Create an inquiry: No
- Leave an agent review: No
- Manage own listings: No
- View agent inquiries: No
- Approve agents: No
- Change property status: No
- Access dashboard: No

Unverified Buyer:
- Browse properties: Yes
- Save a property: No, backend blocks
- Book a viewing: No
- Create an inquiry: No
- Leave an agent review: No
- Manage own listings: No
- View agent inquiries: No
- Approve agents: No
- Change property status: No
- Access dashboard: No, frontend blocks

Verified Buyer:
- Browse properties: Yes
- Save a property: Yes
- Book a viewing: Yes
- Create an inquiry: Yes, backend only
- Leave an agent review: Yes, requires past booking
- Manage own listings: No
- View agent inquiries: No
- Approve agents: No
- Change property status: No
- Access dashboard: Yes

Pending Agent:
- Browse properties: Yes
- Save a property: No
- Book a viewing: No
- Create an inquiry: No
- Leave an agent review: No
- Manage own listings: No, 403
- View agent inquiries: No
- Approve agents: No
- Change property status: No
- Access dashboard: Yes, fallback

Approved Agent:
- Browse properties: Yes
- Save a property: No
- Book a viewing: No
- Create an inquiry: No
- Leave an agent review: No
- Manage own listings: Yes
- View agent inquiries: Yes
- Approve agents: No
- Change property status: No
- Access dashboard: Yes

Admin:
- Browse properties: Yes
- Save a property: No
- Book a viewing: No
- Create an inquiry: No
- Leave an agent review: No
- Manage own listings: No
- View agent inquiries: Yes
- Approve agents: Yes
- Change property status: Yes
- Access dashboard: Yes

The matrix is mostly correct. The main gap is the inquiry system. Verified buyers can call the endpoint, but they have no UI to do so.

5. Frontend Code Issues

useEffectEvent is an Experimental React API

In NotificationContext.jsx, useEffectEvent is imported from React and used for syncNotifications.

useEffectEvent was added as a stable export in React 19, but it is still an emerging pattern and may behave unexpectedly under StrictMode double invocation. This is usable in React 19 but should be documented as a dependency.

ESLint Errors Left Unresolved

From lint.txt, there are several unresolved issues, including:
- MetricCard.jsx: Icon variable assigned but never used.
- NotificationContext.jsx: memoization preservation failures and missing useMemo dependencies.
- PropertiesPage.jsx: missing filters in useEffect dependency array, although the current code appears fixed.

The lint.txt may be stale.

onInquire Prop Name Is Misleading

In PropertyCard.jsx, the prop is named onInquire, but the button says "Book Viewing." In PropertiesPage, it is wired to bookViewing. In HomePage, it is not passed at all.

This naming creates confusion. If the inquiry system gets a UI later, the prop name conflict may cause bugs.

DashboardPage Mixes authFetch and apiRequest

DashboardPage uses authFetch from context, while PropertiesPage uses apiRequest directly.

Both work because authentication is cookie-based, but the pattern is inconsistent. The project should standardize one approach.

No Redirect After Login When Coming From Protected Route

DashboardRoute captures the location in state, but AuthPage.jsx always navigates to /dashboard after login.

The from location state is never read.

Future-proof fix:
Use location.state?.from?.pathname || '/dashboard' after login.

6. Database & Migration Issues

Viewing Bookings Unique Constraint Allows Agent Double-Booking Bug

The unique constraint is on agent_id and scheduled_start.

However, the slot availability query excludes Cancelled bookings. This means that if booking A is cancelled, the slot should reopen. But the unique constraint still blocks a new booking at the same time because the cancelled record still exists.

Fix:
Use a conditional or partial index if supported by the database, or remove the unique constraint and rely on the blocked slots query as the primary enforcement mechanism.

agent_availabilities Has No Unique Constraint on agent_id and day_of_week

An agent could technically have multiple conflicting time blocks on the same day.

The agentAvailabilityUpdate flow deletes all records and recreates them, so duplicates are prevented through that flow. But the database itself has no constraint preventing duplicate or overlapping availability records.

7. Minor Issues

- agentReviewStore uses updateOrCreate, so a buyer can update their review by re-submitting. This may be intended, but the UI does not indicate that reviews can be edited.
- Admin overview returns only the latest 10 records of each type with no pagination.
- ensureDefaultAvailability creates Monday to Friday, 9 AM to 5 PM slots silently on every agentShow call if the agent has no availability records. Viewing a public agent profile should not create database records.
- The featured_image field stores either a relative storage path or a full external URL. ImageUrlResolver handles both correctly.
- Admin adminPropertyUpdate does not touch the image, so an admin cannot override a broken image link.

Summary of Priority Issues

Fix immediately:
1. Add auth:sanctum to agent and admin route groups.
2. Fix the "Book Viewing" button on PropertyCard so it opens the drawer instead of calling bookViewing directly.
3. Fix the unique constraint bug on agent_id and scheduled_start for cancelled bookings.

Fix soon:
4. Remove or properly store the login token. Do not issue tokens that are never used.
5. Add a buyer-facing inquiry form UI, or remove the inquiry backend if viewings replace it.
6. Guard against role demotion of agents who have active listings.
7. Add rate limiting to viewing bookings, review submissions, and save/unsave actions.

Housekeeping:
8. Create a SavedProperty model or remove the generic type hint.
9. Move ensureDefaultAvailability to the agent approval flow, not the public profile view.
10. Add pagination to the admin overview endpoint.
11. Standardize use of authFetch versus apiRequest across pages.
12. Implement the from redirect after login for future-proofing.