<?php

use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\FilterController;
use App\Http\Controllers\Api\CityController;
use App\Http\Controllers\Api\CenterController;
use App\Http\Controllers\Api\AuditFormController;
use App\Http\Controllers\Api\AuditController;
use Illuminate\Support\Facades\Route;

Route::middleware('cors')->group(function () {
    Route::get('/stats', StatsController::class);
    Route::get('/filters', FilterController::class);
    Route::get('/cities', CityController::class);
    Route::get('/centers', CenterController::class);
    Route::get('/audit-forms', AuditFormController::class);
    Route::get('/audits', AuditController::class);
    Route::post('/audits', [AuditController::class, 'store']);
});