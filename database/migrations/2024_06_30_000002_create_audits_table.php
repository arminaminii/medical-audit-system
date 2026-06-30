<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('center_id')
                ->constrained('medical_centers')
                ->cascadeOnDelete();

            $table->string('assessor_name')->default('کارشناس نظارت');
            $table->string('visit_date');
            $table->longText('form_data');
            $table->string('status')->default('draft');

            $table->timestamps();

            // Indexes for common query patterns
            $table->index('status');
            $table->index('visit_date');
            $table->index(['center_id', 'visit_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};