<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_products', function (Blueprint $table) {
            $table->json('variations')->nullable();
            $table->string('image_path')->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('tracking_number')->nullable();
            $table->string('discount_code')->nullable();
            $table->decimal('discount_amount', 10, 2)->default(0);
        });

        Schema::create('seller_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_application_id')->constrained()->cascadeOnDelete();
            $table->string('code', 40);
            $table->decimal('percentage', 5, 2);
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique('code');
        });

        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 120)->nullable();
            $table->text('body');
            $table->text('seller_response')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'seller_product_id', 'buyer_id']);
            $table->index(['seller_application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
        Schema::dropIfExists('seller_discounts');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'discount_code', 'discount_amount']);
        });
        Schema::table('seller_products', function (Blueprint $table) {
            $table->dropColumn(['variations', 'image_path']);
        });
    }
};
