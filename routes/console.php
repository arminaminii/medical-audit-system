<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('audit:forms:cache', function () {
    $source = base_path('src/data/audit-forms.json');
    $dest = storage_path('app/audit-forms.json');

    if (!file_exists($source)) {
        $this->error("Source file not found: {$source}");
        return 1;
    }

    copy($source, $dest);
    $this->info("Audit forms cached to storage/app/audit-forms.json");
})->purpose('Copy audit forms JSON to storage for production use');