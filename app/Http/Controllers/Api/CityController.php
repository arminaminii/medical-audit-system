<?php

namespace App\Http\Controllers\Api;

use App\Models\Center;
use Illuminate\Http\Request;

class CityController
{
    public function __invoke(Request $request)
    {
        $province = $request->query('province');

        if (!$province) {
            return response()->json(['cities' => []]);
        }

        $cities = Center::where('province', $province)
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->filter()
            ->values()
            ->toArray();

        return response()->json(['cities' => $cities]);
    }
}