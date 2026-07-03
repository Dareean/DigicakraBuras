<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 20)->unique();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->enum('order_type', ['print', 'atk', 'mixed']);
            $table->enum('status', ['menunggu_pembayaran', 'diproses', 'selesai', 'siap_diambil', 'dibatalkan'])->default('menunggu_pembayaran');
            $table->decimal('total_amount', 12, 2);
            $table->text('pickup_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
