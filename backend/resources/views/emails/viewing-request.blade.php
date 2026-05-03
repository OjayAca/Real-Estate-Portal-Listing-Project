<h2>New Viewing Request</h2>
<p>A buyer is interested in viewing: <strong>{{ $property->title }}</strong></p>

<p><strong>Requester Details:</strong></p>
<ul>
    <li>Name: {{ $data['buyer_name'] }}</li>
    <li>Email: {{ $data['buyer_email'] }}</li>
    <li>Phone: {{ $data['buyer_phone'] ?? 'N/A' }}</li>
</ul>

<p><strong>Requested Date:</strong> {{ $data['scheduled_start'] ?? 'Not specified' }}</p>

<p><strong>Notes:</strong></p>
<p>{{ $data['notes'] ?? 'No notes provided.' }}</p>

<hr>
<p>Please contact the requester to confirm the viewing time.</p>
