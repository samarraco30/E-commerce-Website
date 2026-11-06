<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'buyer_id',
        'seller_application_id',
        'customer',
        'items',
        'subtotal',
        'shipping_fee',
        'payment_method',
        'status',
        'tracking_history',
        'tracking_number',
        'discount_code',
        'discount_name',
        'discount_amount',
    ];

    protected function casts(): array
    {
        return [
            'customer' => 'encrypted:array',
            'items' => 'array',
            'subtotal' => 'float',
            'shipping_fee' => 'float',
            'discount_amount' => 'float',
            'tracking_history' => 'array',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function sellerApplication(): BelongsTo
    {
        return $this->belongsTo(SellerApplication::class);
    }

    public function returnRequest(): HasOne
    {
        return $this->hasOne(ReturnRequest::class);
    }
}
