<?php

namespace App\Http\Controllers\Api;

use App\Models\Center;
use App\Models\Audit;
use Illuminate\Http\Request;

class StatsController
{
    public function __invoke(Request $request)
    {
        $recentAudits = Audit::with('center')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($audit) => [
                'id' => $audit->id,
                'centerName' => $audit->center?->name,
                'centerType' => $audit->center?->type,
                'location' => ($audit->center?->province ?? '') . ' · ' . ($audit->center?->city ?? ''),
                'visitDate' => $audit->visit_date,
                'assessorName' => $audit->assessor_name,
                'status' => $audit->status,
            ]);

        return response()->json([
            'totalCenters' => Center::count(),
            'provinceCount' => Center::distinct('province')->count('province'),
            'typeCount' => Center::distinct('type')->count('type'),
            'totalAudits' => Audit::count(),
            'recentAudits' => $recentAudits,
        ]);
    }
}