# Plan: Transition from Internal to External Communications

This plan outlines the removal of in-app communications (inquiries, bookings, notifications, and agent schedules) in favor of direct email and phone communication.

## Objective
- Remove all database-backed in-app messaging, booking, and notification systems.
- Redirect contact forms and viewing requests to send emails directly to agents.
- Decouple agent reviews from the booking system.
- Clean up dashboards (Agent and Admin) by removing Lead Management, Viewings, and Availability sections.

## Key Changes

### 1. Database & Schema Updates
- **Migrations**:
    - Create a migration to drop tables: `inquiries`, `viewing_bookings`, `notifications`, `agent_availabilities`.
    - Modify `agent_reviews` table to remove the `booking_id` foreign key constraint and column.
- **Models**:
    - Delete `Inquiry`, `ViewingBooking`, `AgentAvailability`.
    - Update `Agent` model to remove relationships to deleted models.
    - Update `User` model to remove relationships to deleted models.
    - Update `AgentReview` model to remove `booking_id`.

### 2. Backend Services & Logic
- **Email Implementation**:
    - Create `InquiryMail` and `BookingRequestMail` using Laravel Mailables.
    - Configure mail settings in `.env` (using log driver for local testing or SMTP).
- **Service Refactoring**:
    - **InquiryService**: Refactor `createInquiry` and `createAgentInquiry` to send emails instead of creating DB records. Remove `agentInquiriesIndex` and update methods.
    - **AgentEcosystemService**: Refactor `bookViewing` to send an email. Remove `propertyViewingSlots`, `agentAvailabilityUpdate`, `agentViewingsIndex`, etc.
    - **NotificationService**: Refactor `pushNotification` to send an actual email (or remove if redundant with direct mailables).
    - **AgentReview Logic**: Update `agentReviewStore` in `AgentEcosystemService` to remove the requirement for a past booking.
- **Routes**:
    - Remove/Update routes in `api.php` related to notifications, inquiries, and bookings management.

### 3. Frontend UI Updates
- **Components**:
    - Remove `NotificationBell.jsx` and `NotificationContext.jsx`.
    - Update `Layout.jsx` to remove notification-related UI.
    - Update `AgentInquiryModal.jsx` and `ContactAgentModal.jsx` to reflect the transition to email.
    - Update `PropertyDetailsDrawer.jsx`:
        - Remove the calendar/slot picker.
        - Replace the booking flow with a simple "Request a Viewing" form that sends an email.
    - Update `AgentDashboard.jsx`:
        - Remove "Viewing Calendar", "Booked Viewings", and "Lead Management" sections.
        - Remove availability settings.
    - Update `AdminDashboard.jsx`:
        - Remove Lead/Engagement metrics from `AdminAnalytics.jsx`.
        - Remove any Lead management sections.
- **Pages**:
    - `AgentsPage.jsx` and `SellPage.jsx`: Ensure they point to the updated email-based flows.
    - `PropertiesPage.jsx`: Update search/filter if they relied on internal metrics.

## Implementation Steps

### Phase 1: Backend & Schema (Cleanup & Email)
1. Generate and run the migration to drop legacy tables and update reviews.
2. Delete redundant models and update remaining models.
3. Implement `InquiryMail` and `BookingRequestMail`.
4. Refactor `InquiryService` and `AgentEcosystemService` to handle email dispatch.
5. Update `AgentEcosystemService@agentReviewStore` to remove booking check.

### Phase 2: Frontend (Removal & Refactoring)
1. Delete `NotificationContext` and remove its provider from `main.jsx`.
2. Scrub `DashboardPage.jsx`, `AgentDashboard.jsx`, and `AdminDashboard.jsx` of all communication/booking state and UI.
3. Refactor `AgentInquiryModal` and `ContactAgentModal` for the new email-only flow.
4. Simplify `PropertyDetailsDrawer` viewing request section.
5. Update Agent Profile UI to remove the "Availability" display.

### Phase 3: Verification & Testing
1. Verify that submitting an inquiry sends an email (check logs or mailtrap).
2. Verify that requesting a viewing sends an email.
3. Confirm that the dashboards are clean and no longer show "Leads" or "Viewings".
4. Confirm that registered users can leave reviews for agents without prior bookings.
5. Verify no console errors from removed contexts or missing routes.

## Verification
- Run existing tests and update them to reflect the removal of internal communication records.
- Manual end-to-end testing of Inquiry and Booking flows.
- Verify review creation for a fresh user on an agent profile.
