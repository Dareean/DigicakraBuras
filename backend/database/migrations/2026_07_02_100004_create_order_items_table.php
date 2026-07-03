<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->enum('item_type', ['print_doc', 'fotokopi', 'pas_foto', 'undangan', 'atk']);
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->string('file_url')->nullable();
            $table->json('spec_json')->nullable();
            $table->integer('qty');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
