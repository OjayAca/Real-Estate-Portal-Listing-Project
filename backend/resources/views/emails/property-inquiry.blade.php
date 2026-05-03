<h2>New Property Inquiry</h2>
<p>You have received a new inquiry for the property: <strong>{{ $property->title }}</strong></p>

<p><strong>Buyer Details:</strong></p>
<ul>
    <li>Name: {{ $data['buyer_name'] }}</li>
    <li>Email: {{ $data['buyer_email'] }}</li>
    <li>Phone: {{ $data['buyer_phone'] ?? 'N/A' }}</li>
</ul>

<p><strong>Message:</strong></p>
<p>{{ $data['message'] }}</p>

<hr>
<p>Please reply to the buyer directly via email or phone.</p>
