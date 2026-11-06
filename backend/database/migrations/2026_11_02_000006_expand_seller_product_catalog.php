<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_products', function (Blueprint $table) {
            $table->json('variation_combinations')->nullable();
            $table->json('product_media')->nullable();
            $table->string('video_path')->nullable();
            $table->json('producer_media')->nullable();
            $table->json('product_details')->nullable();
            $table->string('subcategory', 120)->nullable();
            $table->string('sku', 120)->nullable();
            $table->unique(['seller_application_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::table('seller_products', function (Blueprint $table) {
            $table->dropUnique(['seller_application_id', 'sku']);
            $table->dropColumn([
                'variation_combinations',
                'product_media',
                'video_path',
                'producer_media',
                'product_details',
                'subcategory',
                'sku',
            ]);
        });
    }
};
