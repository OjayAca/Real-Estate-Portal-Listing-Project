<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $query = http_build_query(array_filter([
        'token' => $token,
        'email' => $request->query('email'),
    ]));

    return redirect()->away(rtrim(config('app.frontend_url'), '/').'/login'.($query !== '' ? '?'.$query : ''));
})->name('password.reset');
