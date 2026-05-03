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
<p>
    <a href="mailto:{{ $data['buyer_email'] }}?subject=Re: Your Inquiry to {{ $agent->full_name }}" 
       style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Reply via Email
    </a>
</p>
<p>Or reply directly to the contact via phone if provided.</p>
