<?php

namespace App\Http\Controllers\Api;

use App\Models\Center;
use Illuminate\Http\Request;

class FilterController
{
    public function __invoke(Request $request)
    {
        $provinces = Center::distinct()
            ->orderBy('province')
            ->pluck('province')
            ->filter()
            ->values()
            ->toArray();

        $types = Center::distinct()
            ->orderBy('type')
            ->pluck('type')
            ->filter()
            ->values()
            ->toArray();

        return response()->json([
            'provinces' => $provinces,
            'types' => $types,
        ]);
    }
}