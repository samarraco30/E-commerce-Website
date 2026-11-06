<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['settings'];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }

    public static function values(): array
    {
        return static::query()->first()?->settings ?? [
            'default_shipping_fee' => 60,
            'buyer_verification_required' => false,
            'returns_enabled' => true,
            'return_window_days' => 14,
            'suspicious_order_amount' => 10000,
            'support_email' => '',
        ];
    }
}
