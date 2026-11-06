<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SellerDiscount extends Model
{
    protected $fillable = [
        'seller_application_id',
        'name',
        'code',
        'type',
        'percentage',
        'amount',
        'minimum_spend',
        'reference_subtotal',
        'product_cost',
        'packaging_cost',
        'seller_fees',
        'other_expenses',
        'desired_profit',
        'max_uses',
        'uses',
        'starts_at',
        'ends_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'minimum_spend' => 'float',
            'reference_subtotal' => 'float',
            'product_cost' => 'float',
            'packaging_cost' => 'float',
            'seller_fees' => 'float',
            'other_expenses' => 'float',
            'desired_profit' => 'float',
            'percentage' => 'float',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function sellerApplication(): BelongsTo
    {
        return $this->belongsTo(SellerApplication::class);
    }

    public function claimants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'claimed_seller_discounts')
            ->withTimestamps();
    }
}
