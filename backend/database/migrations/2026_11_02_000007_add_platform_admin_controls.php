<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_suspended')->default(false);
            $table->string('suspension_reason', 500)->nullable();
        });

        Schema::table('seller_products', function (Blueprint $table) {
            $table->boolean('admin_suspended')->default(false);
            $table->string('admin_moderation_reason', 500)->nullable();
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 120);
            $table->text('description');
            $table->string('status', 30)->default('pending')->index();
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique('order_id');
            $table->index(['status', 'created_at']);
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->json('settings');
            $table->timestamps();
        });
        DB::table('platform_settings')->insert([
            'settings' => json_encode([
                'default_shipping_fee' => 60,
                'buyer_verification_required' => false,
                'returns_enabled' => true,
                'return_window_days' => 14,
                'suspicious_order_amount' => 10000,
                'support_email' => '',
            ], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('return_requests');

        Schema::table('seller_products', function (Blueprint $table) {
            $table->dropColumn(['admin_suspended', 'admin_moderation_reason']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_verified', 'is_suspended', 'suspension_reason']);
        });
    }
};
