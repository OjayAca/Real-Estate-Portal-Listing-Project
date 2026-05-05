1. Objective

To review the project app’s backend and frontend, identify possible issues, errors, weak logic, missing features, and suggest improvements needed for a more complete and realistic real estate portal system.

2. Overall Project Assessment

Your project already has a good foundation. It is not just a simple listing website because it already includes several important modules such as:

User registration and login
Buyer account features
Agent account features
Admin dashboard
Property listings
Saved properties
Saved searches
Seller leads
Agent approval
Notifications
Property inquiries
Agent reviews

However, the system still feels more like a property listing platform rather than a complete real estate portal with full lead, inquiry, appointment, and transaction management.

The biggest improvement needed is to make buyer-agent activities more traceable inside the system instead of relying mainly on email notifications.

3. Backend Issues and Concerns
3.1 Authentication Flow Needs Clarification

The backend appears to use Laravel Sanctum session-based authentication.

This is okay, but it should be clearly documented because some developers may expect the login API to return a token.

Issue:

Login does not return a bearer token.
The project should clearly state that it uses cookie/session-based authentication.
Frontend and backend must be properly configured for Sanctum authentication.

Recommended improvement:

Clearly document the authentication setup in the README file.

 
3.3 
3.4 Viewing Requests Are Not Yet a Complete Booking System

The project may allow buyers to request viewings, but it does not fully behave like a real appointment booking system.

Issue:

No proper appointment database workflow.
No agent calendar.
No confirmation/reschedule/cancellation process.
No complete viewing request history.

Recommended improvement:

Add a viewing_requests or appointments table.

Suggested fields:

Viewing request ID
Buyer ID
Agent ID
Property ID
Requested date
Requested time
Confirmed date
Confirmed time
Status
Buyer message
Agent notes

Suggested statuses:

Pending
Confirmed
Rescheduled
Cancelled
Completed
3.5 Property View Count May Be One Count Behind

When a property is viewed, the backend increments the view count. However, if the property data is returned immediately, the displayed count may not show the updated value.

Issue:

The returned views_count may be outdated by one count.

Recommended improvement:

After incrementing the view count, refresh the property model before returning it.

Example:

$property->increment('views_count');
$property->refresh();
3.6 Property Status Mismatch

There appears to be a mismatch between frontend property status options and backend validation.

Issue:

The frontend may allow a status such as:

Inactive

But the backend may not allow that value during validation.

Possible result:

The user selects “Inactive,” submits the form, and gets a validation error.

Recommended improvement:

Either:

Remove “Inactive” from the frontend, or
Allow “Inactive” in the backend validation

Both frontend and backend should use the same status list.

Suggested property statuses:

Draft
Pending Review
Available
Reserved
Sold
Rented
Inactive
Rejected
3.7 Area Validation Is Too Strict

The backend may be using integer validation for property area.

Issue:

Real estate areas can have decimal values.

Example:

45.5 sqm
120.75 sqm
300.25 sqm

Recommended improvement:

Use numeric or decimal validation instead of integer validation.

3.8 Listed Date Should Be Handled Properly

When an admin approves a property and changes its status to Available, the system should set a listed_at date.

Issue:

If listed_at is missing, the system may not correctly identify when the property became publicly available.

Recommended improvement:

When status changes to Available, set:

listed_at = current date/time

This is important for:

Newest listing sorting
Saved search alerts
Property analytics
Admin reports
3.9 Saved Search Alerts Should Use Listed Date

Saved search alerts should not depend only on created_at.

Issue:

A property may be created as Draft today but published next week. If alerts only use created_at, the system may miss newly published listings.

Recommended improvement:

Use listed_at instead of created_at for saved search notifications.

3.10 Agent Directory Should Avoid Database Side Effects

Public browsing pages should generally not modify database records unless necessary.

Issue:

If the agent directory triggers sync or cleanup actions while users browse, that is not ideal.

Recommended improvement:

Move cleanup/sync actions to:

Seeder
Artisan command
Admin-only function
Scheduled task
4. Frontend Issues and Concerns
4.1 

4.2 No Full Property Detail Page

This is a major missing frontend feature.

Issue:

The system does not appear to have a proper individual property details route like:

/properties/:id
/properties/:slug

Why this matters:

A real estate portal needs shareable property pages.

Recommended improvement:

Create a property details page with:

Full property images
Price
Location
Property description
Agent information
Inquiry button
Viewing request button
Map location
Similar properties
Save property button
Share button
4.3 Saved Property Display May Become Inaccurate

If a user has many saved properties, the frontend may only fetch the first page of saved properties.

Issue:

A property may already be saved, but the UI may still show it as unsaved.

Recommended improvement:

Create an endpoint that returns only saved property IDs.

Example:

GET /api/saved-property-ids

Then the frontend can accurately display saved/unsaved icons.

4.4 Agent Availability Feature Is Incomplete

The frontend may show agent availability, but the backend does not fully support real availability scheduling.

Issue:

The UI suggests that availability exists, but the system does not fully manage it.

Recommended improvement:

Add an agent availability module.

Suggested fields:

Agent ID
Available day
Start time
End time
Blocked dates
Maximum appointments per day
Timezone
4.5 
5. Security and Deployment Issues
5.1 Environment File Should Not Be Shared

The project package includes an .env file.

Issue:

This is a security risk because it may contain private values such as:

App key
Database credentials
Mail credentials
API keys
Service tokens

Recommended improvement:

Remove .env from the submitted or uploaded project.

Keep only:

.env.example

Also regenerate exposed credentials if real values were included.

5.2 Dependency Folders Should Not Be Included

The project includes folders such as:

node_modules
vendor
.git

Issue:

These make the project too large and may cause installation or permission problems.

Recommended improvement:

Do not include these folders in the final ZIP.

Instead, include installation instructions.

Backend setup:

composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve

Frontend setup:

npm install
npm run dev
5.3 Possible Vite / Windows Permission Issue

There may be an EPERM or spawn-related issue when running Vite on Windows.

Common causes:

Broken node_modules
Antivirus blocking files
Restricted folder permission
Copied dependency folder
Running inside a protected directory

Recommended fix:

cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
npm run dev
6. Admin Dashboard Review
6.1 Good Existing Admin Features

The admin side already has useful features such as:

User management
Agent approval
Property review
Seller lead assignment
Dashboard analytics
Notifications
Property status management
6.2 Missing Admin Features

The admin dashboard can be improved by adding:

Inquiry management
Viewing request management
Reported listing moderation
Agent performance tracking
Buyer activity tracking
Lead conversion tracking
Spam inquiry detection
Admin audit logs
User suspension reason
Property verification workflow
6.3 Recommended Admin Improvements

Add admin reports for:

Total active listings
Total pending listings
Total inquiries
Total viewing requests
Most viewed properties
Most saved properties
Agent response time
Seller lead status
Buyer engagement
Closed transactions
7. Buyer Portal Review
7.1 Good Existing Buyer Features

The buyer side already includes:

Browse properties
Search and filter listings
Save properties
Save searches
Contact agents
Request viewings
Review agents
7.2 Missing Buyer Features

Recommended buyer-side additions:

Property detail page
Inquiry history
Viewing request tracker
Recently viewed properties
Property comparison tool
Mortgage calculator
Budget calculator
Recommended listings
Buyer profile preferences
Message center
7.3 Recommended Buyer Dashboard Sections

A buyer dashboard may include:

Saved properties
Saved searches
My inquiries
My viewing requests
Recently viewed
Recommended properties
My reviews
Account settings
8. Agent Portal Review
8.1 Good Existing Agent Features

The agent side already has:

Agent registration
Admin approval
Property creation
Property editing
Listing image upload
Seller lead management
Notifications
8.2 Missing Agent Features

Recommended additions:

Inquiry inbox
Viewing appointment calendar
Buyer lead pipeline
Agent availability settings
Property performance analytics
Response time tracking
Auto-reply templates
Agent public profile customization
License/document upload
Listing draft checklist
8.3 Suggested Agent Lead Pipeline

For a professional real estate workflow, use lead statuses such as:

New Lead
Contacted
Viewing Scheduled
Viewing Completed
Negotiation
Reserved
Closed
Lost
Cancelled
9. Property Listing Module Review
9.1 Good Existing Property Features

The property module already supports:

Property creation
Property editing
Property filtering
Property images
Property status
Views count
Saved properties
9.2 Missing Property Features

Recommended additions:

Property slug
Property detail page
Map coordinates
Nearby landmarks
Floor area decimals
Lot area decimals
Property amenities
Property documents
Verification badge
Report listing button
Listing expiration date
Featured listing option
9.3 Suggested Property Fields

A more complete property table may include:

Property ID
Agent ID
Title
Slug
Description
Property type
Listing purpose: Sale or Rent
Price
Address
City
Province
Barangay
Latitude
Longitude
Bedrooms
Bathrooms
Parking slots
Floor area in sqm
Lot area in sqm
Status
Verification status
Listed date
Expiration date
Views count
10. Missing Real Estate Portal Features

For a more realistic real estate portal, consider adding:

Property details page
Map-based search
Property comparison
Mortgage calculator
Rent affordability calculator
Inquiry inbox
Viewing appointment system
Agent availability calendar
Buyer dashboard
Agent CRM dashboard
Admin moderation panel
Report listing feature
Verified listing badge
Verified agent badge
Property document uploads
Lead status tracking
Message center
Notification history
Email queue system
SMS verification
CAPTCHA for public forms
SEO-friendly listing pages
Terms and privacy policy
Consent checkbox for inquiries
Audit logs
11. Priority Fix List
11.1 Critical Fixes

Fix these first:


Fix React hook rule errors.
Remove .env from the shared project.
Remove node_modules, vendor, and .git from final ZIP.
Add database storage for inquiries.
Add database storage for viewing requests.
Add a real property detail page.
Fix frontend/backend property status mismatch.
Use listed_at for published properties.

11.2 High Priority Improvements

Next improvements:

Add agent inquiry inbox.
Add admin inquiry management.
Add viewing request calendar.
Add seller lead pipeline.
Add property performance analytics.
Add saved search alert improvements.
Add listing report/moderation feature.
Add spam protection for public forms.
11.3 Medium Priority Improvements

Future enhancements:

Add map search.
Add mortgage calculator.
Add property comparison.
Add agent public profile customization.
Add recently viewed properties.
Add recommended listings.
Improve UI animations and loading states.
Optimize image sizes and frontend bundle size.
12. Suggested Database Tables to Add
12.1 Inquiries Table

Purpose:

To store all buyer inquiries.

Suggested fields:

id
buyer_id
agent_id
property_id
name
email
contact_number
message
status
created_at
updated_at
12.2 Viewing Requests Table

Purpose:

To manage property viewing appointments.

Suggested fields:

id
buyer_id
agent_id
property_id
requested_date
requested_time
confirmed_date
confirmed_time
status
message
agent_notes
created_at
updated_at
12.3 Agent Availability Table

Purpose:

To allow agents to set their available schedule.

Suggested fields:

id
agent_id
day_of_week
start_time
end_time
is_available
created_at
updated_at
12.4 Reports Table

Purpose:

To allow users to report suspicious listings.

Suggested fields:

id
reporter_id
property_id
reason
description
status
admin_notes
created_at
updated_at
13. Sample Input

A buyer searches for a condominium with the following details:

Location: Manila
Purpose: Buy
Minimum price: ₱2,000,000
Maximum price: ₱5,000,000
Bedrooms: 2
Property type: Condominium

Then the buyer saves the property and requests a viewing.

14. Expected Output

The system should:

Display matching available properties.
Allow the buyer to open a full property details page.
Allow the buyer to save the property.
Store the saved property in the database.
Allow the buyer to submit an inquiry.
Store the inquiry in the database.
Notify the assigned agent.
Allow the buyer to request a viewing schedule.
Store the viewing request in the database.
Allow the agent to confirm, reschedule, or cancel the viewing.
Notify the buyer about the viewing status.
Allow the admin to monitor the inquiry and viewing activity.
15. Final Recommendation

Your project is already good as a prototype real estate listing system, but it needs stronger backend workflows to become a real real estate portal.

The most important missing part is not the design. The most important missing part is the transaction and communication flow.

Right now, the app can show listings and send some notifications, but a real portal should also track:

Who inquired
Which property was inquired about
Which agent handled the inquiry
What the status of the inquiry is
Whether a viewing was requested
Whether the viewing was confirmed
Whether the lead became a successful transaction

Once you add the inquiry database, viewing request system, property detail pages, and agent lead pipeline, the project will feel much more complete and professional.