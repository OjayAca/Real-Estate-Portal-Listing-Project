<h2>New Listings Matching "{{ $searchName }}"</h2>
<p>We found {{ $properties->count() }} new listing(s) that match your saved search.</p>

@foreach ($properties as $property)
<div style="margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
    <strong>{{ $property['title'] }}</strong><br>
    <span>{{ $property['city'] }}, {{ $property['state'] ?? '' }}</span><br>
    <span style="font-size: 18px; font-weight: bold; color: #1a73e8;">
        ₱{{ number_format($property['price']) }}
    </span><br>
    <span>{{ $property['bedrooms'] ?? '—' }} Beds &middot; {{ $property['bathrooms'] ?? '—' }} Baths</span>
</div>
@endforeach

<hr>
<p>
    <a href="{{ $frontendUrl }}"
       style="display: inline-block; padding: 10px 20px; background-color: #1a73e8; color: white; text-decoration: none; border-radius: 5px;">
        View All Results
    </a>
</p>
<p style="font-size: 12px; color: #666;">
    You can manage your saved searches and alert preferences from your Account Settings.
</p>
