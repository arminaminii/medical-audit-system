<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class AuditFormsSeeder extends Seeder
{
    /**
     * Copy the audit-forms.json to storage/app/ so the controller
     * can read it at runtime. This avoids shipping a large JSON
     * payload through migrations and keeps the form definitions
     * version-controlled in /src/data/.
     */
    public function run(): void
    {
        $source = base_path('src/data/audit-forms.json');
        $destination = storage_path('app/audit-forms.json');

        if (! File::exists($source)) {
            $this->command->warn("Source file not found: {$source}");
            return;
        }

        // Ensure the storage/app directory exists
        if (! File::isDirectory(dirname($destination))) {
            File::makeDirectory(dirname($destination), 0755, true);
        }

        File::copy($source, $destination);

        $forms = json_decode(File::get($source), true);

        $this->command->info(
            sprintf('Copied %d audit form categories to %s', count($forms), $destination)
        );
    }
}