<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claimed_seller_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_discount_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'seller_discount_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claimed_seller_discounts');
    }
};
