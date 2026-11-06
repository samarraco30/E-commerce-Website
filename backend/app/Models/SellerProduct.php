<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerProduct extends Model
{
    protected $fillable = [
        'seller_application_id',
        'name',
        'category',
        'description',
        'price',
        'unit',
        'stock',
        'image_url',
        'image_path',
        'variations',
        'variation_combinations',
        'product_media',
        'video_path',
        'producer_media',
        'product_details',
        'subcategory',
        'sku',
        'is_active',
        'admin_suspended',
        'admin_moderation_reason',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'stock' => 'integer',
            'is_active' => 'boolean',
            'admin_suspended' => 'boolean',
            'variations' => 'array',
            'variation_combinations' => 'array',
            'product_media' => 'array',
            'producer_media' => 'array',
            'product_details' => 'array',
        ];
    }

    public function sellerApplication(): BelongsTo
    {
        return $this->belongsTo(SellerApplication::class);
    }
}
