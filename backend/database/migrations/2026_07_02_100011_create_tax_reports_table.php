<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_reports', function (Blueprint $table) {
            $table->id();
            $table->enum('period_type', ['harian', 'bulanan', 'tahunan']);
            $table->string('period_value', 20); // e.g. "2026-07"
            $table->decimal('total_revenue', 14, 2);
            $table->timestamp('generated_at');
            $table->string('file_url');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_reports');
    }
};
