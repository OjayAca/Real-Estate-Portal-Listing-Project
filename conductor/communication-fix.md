# Implementation Plan - Single Response Communication

The objective is to enable "responding back" for both property inquiries and viewing bookings by adding missing response fields to the database and updating the backend and frontend to support them.

## Changes

### 1. Database (Migrations)

- Create a new migration to:
    - Add `buyer_reply` (text, nullable) and `buyer_replied_at` (timestamp, nullable) to the `inquiries` table.
    - Add `agent_response` (text, nullable) and `agent_responded_at` (timestamp, nullable) to the `viewing_bookings` table.

### 2. Backend (Laravel)

#### Models
- **Inquiry.php**: Add `buyer_reply` and `buyer_replied_at` to `$fillable` and `$casts`.
- **ViewingBooking.php**: Add `agent_response` and `agent_responded_at` to `$fillable` and `$casts`.

#### Services & Controllers
- **PortalService.php**:
    - Add `buyerInquiryUpdate(Request $request, Inquiry $inquiry)` to allow buyers to set their reply.
    - Update `formatInquiry()` to include the new fields.
    - Update `agentInquiryUpdate()` to ensure agent can still respond (no major changes needed but check compatibility).
- **AgentEcosystemService.php**:
    - Update `agentViewingUpdate(Request $request, ViewingBooking $booking)` to accept and save `agent_response`.
    - Update `formatBooking()` to include the new fields.
- **Routes (api.php)**:
    - Add `PATCH /inquiries/{inquiry}/reply` for buyers.

### 3. Frontend (React)

#### DashboardPage.jsx
- **Buyer View (Inquiry History)**:
    - Add a "Reply to Agent" button/textarea if `response_message` exists and `buyer_reply` is empty.
    - Display `buyer_reply` if it exists.
- **Agent View (Lead Management)**:
    - Display `buyer_reply` if the buyer has sent one.
- **Agent View (Booked Viewings)**:
    - Add a textarea for "Agent Response/Notes" in the booking status update area.
- **Buyer View (Viewing Status - Need to find where this is)**:
    - Display `agent_response` if provided by the agent.

## Verification & Testing

### Automated Tests
- Create a feature test to verify:
    - Buyer can reply to an inquiry.
    - Agent can respond to a viewing booking.
    - Notifications are sent when these responses occur.

### Manual Verification
1.  **Inquiry Flow**:
    -   Buyer sends inquiry.
    -   Agent responds.
    -   Buyer sees response and sends a reply.
    -   Agent sees the buyer's reply.
2.  **Booking Flow**:
    -   Buyer books a viewing.
    -   Agent updates status and adds a response message.
    -   Buyer sees the agent's response message.
