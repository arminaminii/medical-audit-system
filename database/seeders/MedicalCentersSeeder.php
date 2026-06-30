<?php

namespace Database\Seeders;

use App\Models\Center;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class MedicalCentersSeeder extends Seeder
{
    /**
     * Read /src/data/centers-import.json and insert records in batches
     * of 500. The JSON keys are mapped from camelCase to snake_case.
     */
    public function run(): void
    {
        $source = base_path('src/data/centers-import.json');

        if (! File::exists($source)) {
            $this->command->warn("Source file not found: {$source}");
            return;
        }

        $json = File::get($source);
        $centers = json_decode($json, true);

        if (! is_array($centers)) {
            $this->command->error('Failed to parse centers JSON.');
            return;
        }

        $mapped = collect($centers)->map(function (array $item): array {
            return [
                'center_name'       => $item['name'] ?? '',
                'center_code'       => $item['centerCode'] ?? '',
                'type'              => $item['type'] ?? '',
                'is_online'         => (bool) ($item['isOnline'] ?? false),
                'description'       => $item['description'] ?? null,
                'display_name'      => $item['displayName'] ?? null,
                'province'          => $item['province'] ?? '',
                'city'              => $item['city'] ?? '',
                'phone'             => $item['phone'] ?? null,
                'postal_code'       => $item['postalCode'] ?? null,
                'fax'               => $item['fax'] ?? null,
                'address'           => $item['address'] ?? '',
                'longitude'         => isset($item['longitude']) ? (float) $item['longitude'] : null,
                'latitude'          => isset($item['latitude']) ? (float) $item['latitude'] : null,
                'code'              => isset($item['code']) ? (int) $item['code'] : null,
                'economic_code'     => $item['economicCode'] ?? null,
                'center_register_no'=> $item['centerRegisterNo'] ?? null,
                'is_active'         => $item['isActive'] ?? 'فعال',
                'user_code'         => isset($item['userCode']) ? (int) $item['userCode'] : null,
                'created_at'        => now(),
                'updated_at'        => now(),
            ];
        });

        // Insert in batches of 500 for memory efficiency
        $mapped->chunk(500)->each(function ($chunk): void {
            Center::insert($chunk->toArray());
        });

        $this->command->info("Seeded {$mapped->count()} medical centers successfully.");
    }
}