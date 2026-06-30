<?php

namespace App\Http\Controllers\Api;

use App\Models\Center;
use Illuminate\Http\Request;

class CenterController
{
    public function __invoke(Request $request)
    {
        $query = Center::query();

        if ($province = $request->query('province')) {
            $query->where('province', $province);
        }

        if ($city = $request->query('city')) {
            $query->where('city', $city);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('center_name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->has('isOnline') && $request->query('isOnline') !== '') {
            $query->where('is_online', $request->query('isOnline'));
        }

        $limit = (int) $request->query('limit', 25);
        $page = (int) $request->query('page', 1);
        $total = $query->count();
        $totalPages = (int) ceil($total / $limit);

        $centers = $query
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->get();

        return response()->json([
            'centers' => $centers,
            'pagination' => [
                'total' => $total,
                'totalPages' => $totalPages,
                'page' => $page,
            ],
        ]);
    }
}