<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GUEST ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    Route::get(
        'login',
        [
            AuthenticatedSessionController::class,
            'create',
        ]
    )->name('login');

    Route::post(
        'login',
        [
            AuthenticatedSessionController::class,
            'store',
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | FORGOT PASSWORD
    |--------------------------------------------------------------------------
    */

    Route::get(
        'forgot-password',
        [
            PasswordResetLinkController::class,
            'create',
        ]
    )->name('password.request');

    Route::post(
        'forgot-password',
        [
            PasswordResetLinkController::class,
            'store',
        ]
    )->name('password.email');


    /*
    |--------------------------------------------------------------------------
    | RESET PASSWORD
    |--------------------------------------------------------------------------
    */

    Route::get(
        'reset-password/{token}',
        [
            NewPasswordController::class,
            'create',
        ]
    )->name('password.reset');

    Route::post(
        'reset-password',
        [
            NewPasswordController::class,
            'store',
        ]
    )->name('password.store');
});


/*
|--------------------------------------------------------------------------
| AUTHENTICATED ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | STAFF LOGIN PIN
    |--------------------------------------------------------------------------
    */

    Route::get(
        'verify-otp',
        [
            AuthenticatedSessionController::class,
            'showOtp',
        ]
    )->name('verification.otp');

    Route::post(
        'verify-otp',
        [
            AuthenticatedSessionController::class,
            'verifyOtp',
        ]
    )->name('verification.otp.verify');

    Route::post(
        'verify-otp/resend',
        [
            AuthenticatedSessionController::class,
            'resendOtp',
        ]
    )->name('verification.otp.resend');


    /*
    |--------------------------------------------------------------------------
    | PASSWORD CONFIRMATION
    |--------------------------------------------------------------------------
    */

    Route::get(
        'confirm-password',
        [
            ConfirmablePasswordController::class,
            'show',
        ]
    )->name('password.confirm');

    Route::post(
        'confirm-password',
        [
            ConfirmablePasswordController::class,
            'store',
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | CHANGE PASSWORD
    |--------------------------------------------------------------------------
    */

    Route::put(
        'password',
        [
            PasswordController::class,
            'update',
        ]
    )->name('password.update');


    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    Route::post(
        'logout',
        [
            AuthenticatedSessionController::class,
            'destroy',
        ]
    )->name('logout');
});
