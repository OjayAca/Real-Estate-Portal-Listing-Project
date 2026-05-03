# Plan: Enable Direct Email Replies for Agents

## Objective
Update the inquiry email logic to allow agents to reply directly to clients using their email client's "Reply" button.

## Key Files & Context
- `backend/app/Mail/PropertyInquiryMail.php`: Handles emails sent when a user inquires about a specific property.
- `backend/app/Mail/AgentInquiryMail.php`: Handles emails sent when a user contacts an agent directly.

## Implementation Steps

### 1. Update PropertyInquiryMail
Modify the `envelope()` method in `backend/app/Mail/PropertyInquiryMail.php` to include the `replyTo` parameter.

**Change:**
```php
public function envelope(): Envelope
{
    return new Envelope(
        subject: 'New Inquiry: ' . $this->property->title,
        replyTo: [
            $this->data['buyer_email'],
        ],
    );
}
```

### 2. Update AgentInquiryMail
Modify the `envelope()` method in `backend/app/Mail/AgentInquiryMail.php` to include the `replyTo` parameter.

**Change:**
```php
public function envelope(): Envelope
{
    return new Envelope(
        subject: 'New Direct Message: Lead Inquiry',
        replyTo: [
            $this->data['buyer_email'],
        ],
    );
}
```

## Verification & Testing
1. Send a test inquiry through the frontend (Buy page -> Email Agent).
2. Check Mailtrap for the incoming email.
3. Verify that the "Reply-To" field in the email header matches the email address entered in the form.
4. Click "Reply" in the email client (or Mailtrap's view) and ensure the recipient is automatically set to the client's email address.
