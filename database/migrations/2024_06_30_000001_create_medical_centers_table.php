<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_centers', function (Blueprint $table) {
            $table->id();

            $table->string('center_name');
            $table->string('center_code');
            $table->string('type')->index();
            $table->boolean('is_online')->default(false);
            $table->text('description')->nullable();
            $table->string('display_name')->nullable();
            $table->string('province')->index();
            $table->string('city')->index();
            $table->string('phone')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('fax')->nullable();
            $table->text('address');
            $table->float('longitude')->nullable();
            $table->float('latitude')->nullable();
            $table->integer('code')->nullable();
            $table->string('economic_code')->nullable();
            $table->string('center_register_no')->nullable();
            $table->string('is_active')->default('فعال');
            $table->integer('user_code')->nullable();

            $table->timestamps();

            // Composite index for common province+city queries
            $table->index(['province', 'city']);
            // Index for center_code lookups
            $table->index('center_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_centers');
    }
};