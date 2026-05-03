<h2>New Direct Inquiry</h2>
<p>You have received a new direct inquiry through your profile.</p>

<p><strong>Contact Details:</strong></p>
<ul>
    <li>Name: {{ $data['buyer_name'] }}</li>
    <li>Email: {{ $data['buyer_email'] }}</li>
    <li>Phone: {{ $data['buyer_phone'] ?? 'N/A' }}</li>
</ul>

<p><strong>Message:</strong></p>
<p>{{ $data['message'] }}</p>

<hr>
<p>Please reply to the contact directly via email or phone.</p>
