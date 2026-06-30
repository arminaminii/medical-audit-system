<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('audit');
});

Route::get('/uploads/{path}', function ($path) {
    $file = storage_path('app/public/' . $path);
    if (!file_exists($file)) abort(404);
    return response()->file($file);
})->where('path', '.*');