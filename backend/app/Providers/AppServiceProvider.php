<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request): Limit {
            $email = Str::lower((string) $request->input('email'));

            return Limit::perMinute(5)->by($email !== '' ? $request->ip().'|'.$email : $request->ip());
        });

        RateLimiter::for('verification-notification', function (Request $request): Limit {
            return Limit::perMinute(6)->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });

        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(60)->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });

        RateLimiter::for('strict', function (Request $request): Limit {
            return Limit::perMinute(10)->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });
    }
}
