<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellerApplication extends Model
{
    protected $fillable = [
        'user_id',
        'shop_name',
        'category',
        'status',
        'application_data',
        'documents',
        'reviewer_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'application_data' => 'encrypted:array',
            'documents' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function products(): HasMany
    {
        return $this->hasMany(SellerProduct::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(SellerDiscount::class);
    }
}
