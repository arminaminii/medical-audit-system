<?php

namespace App\Http\Controllers\Api;

use App\Models\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AuditController
{
    public function __invoke(Request $request)
    {
        $auditId = $request->query('auditId');

        if (!$auditId) {
            return response()->json(['audit' => null, 'message' => 'شناسه ممیزی مشخص نشده.'], 400);
        }

        $audit = Audit::with('center')->find($auditId);

        if (!$audit) {
            return response()->json(['audit' => null], 404);
        }

        return response()->json(['audit' => $audit]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'centerId' => 'required|integer|exists:medical_centers,id',
            'assessorName' => 'nullable|string|max:255',
            'visitDate' => 'nullable|string|max:50',
            'formData' => 'required|string',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => $validator->errors()->first(),
            ], 422);
        }

        $audit = Audit::create([
            'center_id' => $request->input('centerId'),
            'assessor_name' => $request->input('assessorName', 'کارشناس نظارت'),
            'visit_date' => $request->input('visitDate'),
            'form_data' => $request->input('formData'),
            'status' => $request->input('status', 'draft'),
        ]);

        return response()->json([
            'success' => true,
            'id' => $audit->id,
        ]);
    }
}