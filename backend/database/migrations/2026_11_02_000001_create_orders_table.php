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
            $table->string('order_number', 32)->unique();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_application_id')->constrained()->restrictOnDelete();
            $table->text('customer');
            $table->json('items');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('shipping_fee', 10, 2)->default(60);
            $table->string('payment_method')->default('Cash on delivery');
            $table->string('status')->default('Order placed')->index();
            $table->json('tracking_history');
            $table->timestamps();
            $table->index(['buyer_id', 'created_at']);
            $table->index(['seller_application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
