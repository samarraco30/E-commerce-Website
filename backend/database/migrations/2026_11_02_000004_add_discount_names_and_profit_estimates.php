<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_discounts', function (Blueprint $table) {
            $table->string('name', 120)->nullable();
            $table->decimal('reference_subtotal', 10, 2)->nullable();
            $table->decimal('product_cost', 10, 2)->nullable();
            $table->decimal('packaging_cost', 10, 2)->nullable();
            $table->decimal('seller_fees', 10, 2)->nullable();
            $table->decimal('other_expenses', 10, 2)->nullable();
            $table->decimal('desired_profit', 10, 2)->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('discount_name', 120)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('discount_name');
        });

        Schema::table('seller_discounts', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'reference_subtotal',
                'product_cost',
                'packaging_cost',
                'seller_fees',
                'other_expenses',
                'desired_profit',
            ]);
        });
    }
};
