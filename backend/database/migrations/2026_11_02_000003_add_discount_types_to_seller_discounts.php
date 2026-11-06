<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_discounts', function (Blueprint $table) {
            $table->string('type')->default('percentage');
            $table->decimal('amount', 10, 2)->nullable();
            $table->decimal('minimum_spend', 10, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('seller_discounts', function (Blueprint $table) {
            $table->dropColumn(['type', 'amount', 'minimum_spend']);
        });
    }
};
