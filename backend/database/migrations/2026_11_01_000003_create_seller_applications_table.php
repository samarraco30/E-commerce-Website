<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('shop_name');
            $table->string('category');
            $table->string('status')->default('pending')->index();
            $table->text('application_data');
            $table->json('documents')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('seller_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_application_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category');
            $table->text('description');
            $table->decimal('price', 10, 2);
            $table->string('unit', 80);
            $table->unsignedInteger('stock')->default(0);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['seller_application_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_products');
        Schema::dropIfExists('seller_applications');
    }
};
