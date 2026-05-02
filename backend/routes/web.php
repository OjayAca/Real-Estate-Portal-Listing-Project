<?php

use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill();

    $target = $request->user()->isBuyer() ? '/saved-properties' : '/dashboard';

    return redirect()->away(rtrim(config('app.frontend_url'), '/').$target.'?verified=1');
})->middleware(['auth:sanctum', 'signed', 'throttle:6,1'])->name('verification.verify');

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $query = http_build_query(array_filter([
        'token' => $token,
        'email' => $request->query('email'),
    ]));

    return redirect()->away(rtrim(config('app.frontend_url'), '/').'/login'.($query !== '' ? '?'.$query : ''));
})->name('password.reset');
