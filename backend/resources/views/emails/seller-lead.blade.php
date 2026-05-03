<h2>New Seller Lead</h2>
<p>You have received a new consultation request from a potential seller.</p>

<p><strong>Seller Details:</strong></p>
<ul>
    <li>Name: {{ $lead->full_name }}</li>
    <li>Email: {{ $lead->email }}</li>
    <li>Phone: {{ $lead->phone }}</li>
</ul>

<p><strong>Property Details:</strong></p>
<ul>
    <li>Address: {{ $lead->property_address }}</li>
    <li>Type: {{ $lead->property_type }}</li>
    <li>Bedrooms: {{ $lead->bedrooms }}</li>
    <li>Bathrooms: {{ $lead->bathrooms }}</li>
    <li>Condition: {{ $lead->condition_of_home }}</li>
    <li>Expected Price: {{ $lead->expected_price ?? 'N/A' }}</li>
</ul>

<p><strong>Notes:</strong></p>
<p>{{ $lead->notes ?? 'No additional notes.' }}</p>

<hr>
<p>Please contact the seller to discuss their listing.</p>
