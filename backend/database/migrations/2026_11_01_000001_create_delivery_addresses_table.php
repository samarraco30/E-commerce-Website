<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40);
            $table->string('full_name', 120);
            $table->string('email');
            $table->string('phone', 30);
            $table->string('address');
            $table->string('barangay', 120);
            $table->string('city', 120);
            $table->string('postal_code', 12);
            $table->string('delivery_notes', 500)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_addresses');
    }
};
