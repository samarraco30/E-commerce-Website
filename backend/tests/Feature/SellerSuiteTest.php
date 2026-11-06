<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductReview;
use App\Models\SellerApplication;
use App\Models\SellerProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerSuiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_product_reviews_are_visible_only_for_listed_products(): void
    {
        $buyer = User::factory()->create(['name' => 'Local Buyer']);
        [, $application, $product] = $this->sellerWithProduct();
        $order = Order::create([
            'order_number' => 'AFREVIEWTEST01',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => ['fullName' => $buyer->name],
            'items' => [['id' => "seller-{$product->id}", 'quantity' => 1]],
            'subtotal' => $product->price,
            'tracking_history' => [],
        ]);
        ProductReview::create([
            'seller_application_id' => $application->id,
            'seller_product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'order_id' => $order->id,
            'rating' => 5,
            'title' => 'Fresh and lovely',
            'body' => 'The produce arrived fresh and carefully packed.',
        ]);

        $this->getJson("/api/marketplace/products/seller-{$product->id}/reviews")
            ->assertOk()
            ->assertJsonPath('data.0.buyer', 'Verified buyer')
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.body', 'The produce arrived fresh and carefully packed.');

        $product->update(['is_active' => false]);
        $this->getJson("/api/marketplace/products/seller-{$product->id}/reviews")
            ->assertNotFound();
    }

    private function sellerWithProduct(int $stock = 10, array $variations = []): array
    {
        $seller = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $seller->id,
            'shop_name' => 'Sta Maria Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Sta Maria Farm Shop'],
        ]);
        $product = SellerProduct::create([
            'seller_application_id' => $application->id,
            'name' => 'Fresh Tomatoes',
            'category' => 'Agricultural Products',
            'description' => 'Locally grown tomatoes.',
            'price' => 80,
            'unit' => 'per kilo',
            'stock' => $stock,
            'variations' => $variations,
            'is_active' => true,
        ]);

        return [$seller, $application, $product];
    }

    private function customer(User $buyer): array
    {
        return [
            'fullName' => $buyer->name,
            'email' => $buyer->email,
            'phone' => '09123456789',
            'address' => '12 Market Road',
            'barangay' => 'Poblacion',
            'city' => 'Sta. Maria',
            'postalCode' => '3022',
        ];
    }

    public function test_buyer_can_redeem_a_sellers_discount_and_selected_product_variation(): void
    {
        [$seller, $application, $product] = $this->sellerWithProduct(10, [
            ['name' => 'Size', 'options' => ['Small', 'Large']],
        ]);
        $buyer = User::factory()->create();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/discounts', [
                'name' => 'Farm Fresh Savings',
                'code' => 'FARM10',
                'percentage' => 10,
                'maxUses' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Farm Fresh Savings')
            ->assertJsonPath('data.code', 'FARM10');

        $items = [[
            'id' => "seller-{$product->id}",
            'quantity' => 1,
            'variations' => [['name' => 'Size', 'value' => 'Large']],
        ], [
            'id' => "seller-{$product->id}",
            'quantity' => 1,
            'variations' => [['name' => 'Size', 'value' => 'Small']],
        ]];
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders/discount', [
                'code' => 'farm10',
                'items' => $items,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Farm Fresh Savings')
            ->assertJsonPath('data.discountAmount', 16);

        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => $items,
            'discountCode' => 'FARM10',
        ])
            ->assertCreated()
            ->assertJsonPath('data.0.discountName', 'Farm Fresh Savings')
            ->assertJsonPath('data.0.discountAmount', 16)
            ->assertJsonPath('data.0.items.0.variations.0.value', 'Large')
            ->assertJsonPath('data.0.items.1.variations.0.value', 'Small');

        $this->assertDatabaseHas('seller_discounts', [
            'seller_application_id' => $application->id,
            'code' => 'FARM10',
            'uses' => 1,
        ]);
        $this->assertSame(8, $product->fresh()->stock);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/dashboard')
            ->assertOk()
            ->assertJsonPath('metrics.orders', 1)
            ->assertJsonPath('metrics.revenue', 144)
            ->assertJsonPath('metrics.pendingOrders', 1);
    }

    public function test_buyer_can_redeem_a_fixed_amount_discount(): void
    {
        [$seller, , $product] = $this->sellerWithProduct();
        $buyer = User::factory()->create();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/discounts', [
                'name' => 'Take ₱50',
                'code' => 'TAKE50',
                'type' => 'fixed_amount',
                'amount' => 50,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'fixed_amount')
            ->assertJsonPath('data.amount', 50);

        $item = [['id' => "seller-{$product->id}", 'quantity' => 1]];
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders/discount', ['code' => 'TAKE50', 'items' => $item])
            ->assertOk()
            ->assertJsonPath('data.discountAmount', 50);

        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => $item,
            'discountCode' => 'TAKE50',
        ])
            ->assertCreated()
            ->assertJsonPath('data.0.discountAmount', 50);
    }

    public function test_claimed_voucher_is_auto_applied_but_manual_code_works_without_a_claim(): void
    {
        [$seller, , $product] = $this->sellerWithProduct();
        $buyer = User::factory()->create();
        $otherBuyer = User::factory()->create();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/discounts', [
                'name' => 'Buyer thank-you',
                'code' => 'THANK10',
                'percentage' => 10,
            ])
            ->assertCreated();

        $items = [['id' => "seller-{$product->id}", 'quantity' => 1]];
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders/discount', ['items' => $items])
            ->assertOk()
            ->assertJsonPath('data', null);

        $voucherId = \App\Models\SellerDiscount::query()->where('code', 'THANK10')->value('id');
        $this->postJson("/api/buyer/vouchers/{$voucherId}/claim")
            ->assertCreated();
        $this->getJson('/api/buyer/vouchers')
            ->assertOk()
            ->assertJsonPath('data.0.claimed', true);

        $this->actingAs($otherBuyer, 'sanctum')
            ->getJson('/api/buyer/vouchers')
            ->assertOk()
            ->assertJsonPath('data.0.claimed', false);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders/discount', ['items' => $items])
            ->assertOk()
            ->assertJsonPath('data.name', 'Buyer thank-you')
            ->assertJsonPath('data.discountAmount', 8);

        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => $items,
        ])
            ->assertCreated()
            ->assertJsonPath('data.0.discountCode', 'THANK10')
            ->assertJsonPath('data.0.discountAmount', 8);
    }

    public function test_minimum_spend_discount_requires_threshold_and_applies_fixed_savings(): void
    {
        [$seller, , $product] = $this->sellerWithProduct();
        $product->update(['price' => 600]);
        $buyer = User::factory()->create();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/discounts', [
                'name' => 'Save ₱100 when you spend ₱1,000',
                'code' => 'SAVE100',
                'type' => 'minimum_spend',
                'amount' => 100,
                'minimumSpend' => 1000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'minimum_spend')
            ->assertJsonPath('data.minimum_spend', 1000);

        $singleItem = [['id' => "seller-{$product->id}", 'quantity' => 1]];
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders/discount', ['code' => 'SAVE100', 'items' => $singleItem])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This discount requires an eligible spend of at least ₱1,000.00.');

        $eligibleItems = [['id' => "seller-{$product->id}", 'quantity' => 2]];
        $this->postJson('/api/orders/discount', ['code' => 'SAVE100', 'items' => $eligibleItems])
            ->assertOk()
            ->assertJsonPath('data.discountAmount', 100)
            ->assertJsonPath('data.minimumSpend', 1000);

        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => $eligibleItems,
            'discountCode' => 'SAVE100',
        ])
            ->assertCreated()
            ->assertJsonPath('data.0.discountAmount', 100);
    }

    public function test_seller_can_create_a_discount_without_entering_cost_estimates(): void
    {
        [$seller, $application] = $this->sellerWithProduct();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/discounts', [
                'name' => 'Summer sale',
                'code' => 'SUMMER',
                'type' => 'fixed_amount',
                'amount' => 75,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Summer sale')
            ->assertJsonPath('data.code', 'SUMMER');

        $this->assertDatabaseHas('seller_discounts', [
            'seller_application_id' => $application->id,
            'code' => 'SUMMER',
        ]);
    }

    public function test_buyers_can_review_delivered_items_and_sellers_can_respond(): void
    {
        [$seller, $application, $product] = $this->sellerWithProduct();
        $buyer = User::factory()->create();
        $order = Order::create([
            'order_number' => 'AFREVIEWORDER1',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => $this->customer($buyer),
            'items' => [['id' => "seller-{$product->id}", 'name' => $product->name, 'quantity' => 1, 'price' => 80]],
            'subtotal' => 80,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => 'Delivered',
            'tracking_history' => [],
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$order->order_number}/reviews", [
                'productId' => "seller-{$product->id}",
                'rating' => 5,
                'title' => 'Fresh and tasty',
                'body' => 'Great local produce.',
            ])
            ->assertCreated();

        $reviewId = \App\Models\ProductReview::firstOrFail()->id;
        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/reviews')
            ->assertOk()
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.buyer', $buyer->name);

        $this->postJson("/api/seller/reviews/{$reviewId}/response", [
            'response' => 'Thank you for supporting our farm.',
        ])->assertOk();

        $this->getJson('/api/marketplace/products')
            ->assertOk()
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.reviews', 1);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$order->order_number}/reviews", [
                'productId' => "seller-{$product->id}",
                'rating' => 4,
                'body' => 'Duplicate review.',
            ])
            ->assertConflict();
    }

    public function test_seller_can_upload_product_images_and_save_shop_shipping_settings(): void
    {
        Storage::fake('local');
        [$seller, , $product] = $this->sellerWithProduct();

        $this->actingAs($seller, 'sanctum')
            ->post("/api/seller/products/{$product->id}/image", [
                'image' => UploadedFile::fake()->image('tomatoes.png', 400, 400),
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);

        Storage::disk('local')->assertExists($product->fresh()->image_path);
        $this->getJson("/api/marketplace/products/{$product->id}/image")->assertOk();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/seller/shop', [
                'shopName' => 'Sta Maria Farm Shop',
                'category' => 'Agricultural Products',
                'shopPhone' => '09123456789',
                'shopEmail' => $seller->email,
                'pickupAddress' => '12 Market Road',
                'pickupBarangay' => 'Poblacion',
                'pickupCity' => 'Sta. Maria',
                'shippingFee' => 35,
                'payoutAccountName' => 'Farm Owner',
                'payoutBank' => 'Example Bank',
                'payoutAccountNumber' => 'SECRET-ACCOUNT-123',
                'description' => 'Fresh local produce.',
                'shippingPolicy' => 'Ships within two days.',
            ])
            ->assertOk()
            ->assertJsonPath('data.details.shippingFee', 35)
            ->assertJsonPath('data.details.description', 'Fresh local produce.');

        $this->getJson('/api/marketplace/products')
            ->assertOk()
            ->assertJsonPath('data.0.shippingFee', 35)
            ->assertJsonPath('data.0.storefront.shippingPolicy', 'Ships within two days.');

        $this->assertStringNotContainsString(
            'SECRET-ACCOUNT-123',
            $seller->sellerApplication()->firstOrFail()->getRawOriginal('application_data')
        );
    }

    public function test_variant_prices_stock_and_cancellation_are_managed_per_combination(): void
    {
        [$seller, , $product] = $this->sellerWithProduct(3, [
            ['name' => 'Size', 'options' => ['Small', 'Large']],
        ]);
        $product->update([
            'variation_combinations' => [
                ['options' => [['name' => 'Size', 'value' => 'Small']], 'price' => 80, 'stock' => 1, 'sku' => 'TOM-S'],
                ['options' => [['name' => 'Size', 'value' => 'Large']], 'price' => 120, 'stock' => 2, 'sku' => 'TOM-L'],
            ],
        ]);
        $buyer = User::factory()->create();
        $selectedLarge = [['name' => 'Size', 'value' => 'Large']];

        $response = $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders', [
                'customer' => $this->customer($buyer),
                'items' => [[
                    'id' => "seller-{$product->id}",
                    'quantity' => 1,
                    'variations' => $selectedLarge,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.0.items.0.price', 120)
            ->assertJsonPath('data.0.items.0.variantSku', 'TOM-L');

        $product = $product->fresh();
        $this->assertSame(2, $product->stock);
        $this->assertSame(1, $product->variation_combinations[1]['stock']);

        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => [
                ['id' => "seller-{$product->id}", 'quantity' => 1, 'variations' => $selectedLarge],
                ['id' => "seller-{$product->id}", 'quantity' => 1, 'variations' => $selectedLarge],
            ],
        ])->assertUnprocessable();
        $this->assertSame(2, $product->fresh()->stock);

        $orderNumber = $response->json('data.0.id');
        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/seller/orders/{$orderNumber}/status", ['status' => 'Cancelled'])
            ->assertOk();
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(2, $product->fresh()->variation_combinations[1]['stock']);
    }

    public function test_seller_can_create_a_catalog_product_with_complete_variation_combinations_and_local_details(): void
    {
        [$seller] = $this->sellerWithProduct();
        $combinations = [];
        foreach (['Small', 'Large'] as $size) {
            foreach (['White', 'Brown'] as $color) {
                $combinations[] = [
                    'options' => [
                        ['name' => 'Size', 'value' => $size],
                        ['name' => 'Color', 'value' => $color],
                    ],
                    'price' => $size === 'Large' ? 120 : 80,
                    'stock' => 2,
                    'sku' => "EGG-{$size}-{$color}",
                ];
            }
        }

        $createdProduct = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Local Brown Eggs',
                'category' => 'Agriculture',
                'subcategory' => 'Eggs',
                'description' => 'Fresh eggs from a local farm.',
                'price' => 80,
                'unit' => 'per tray',
                'stock' => 0,
                'variations' => [
                    ['name' => 'Size', 'options' => ['Small', 'Large']],
                    ['name' => 'Color', 'options' => ['White', 'Brown']],
                ],
                'variationCombinations' => $combinations,
                'details' => [
                    'productType' => 'Fresh',
                    'producerName' => 'Sta Maria Farm',
                    'originBarangay' => 'Poblacion',
                    'productSource' => 'Farmer',
                    'locallyProduced' => true,
                    'productStory' => 'Raised and collected locally.',
                    'dimensions' => ['length' => 10, 'width' => 8, 'height' => 6],
                ],
                'isActive' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.stock', 8)
            ->assertJsonPath('data.subcategory', 'Eggs')
            ->assertJsonPath('data.variationCombinations.2.price', 120)
            ->assertJsonPath('data.details.originBarangay', 'Poblacion');

        $publicProducts = $this->getJson('/api/marketplace/products')->assertOk()->json('data');
        $publicProduct = collect($publicProducts)->firstWhere('id', "seller-{$createdProduct->json('data.id')}");
        $this->assertSame('Sta Maria Farm', $publicProduct['details']['producerName']);
        $this->assertSame(2, $publicProduct['variationCombinations'][0]['stock']);
    }

    public function test_product_minimum_and_maximum_order_quantities_are_enforced(): void
    {
        [, , $product] = $this->sellerWithProduct(10);
        $product->update(['product_details' => ['minimumOrder' => 2, 'maximumOrder' => 3]]);
        $buyer = User::factory()->create();
        $item = ['id' => "seller-{$product->id}"];

        $this->actingAs($buyer, 'sanctum')->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => [[...$item, 'quantity' => 1]],
        ])->assertUnprocessable();
        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => [[...$item, 'quantity' => 4]],
        ])->assertUnprocessable();
        $this->postJson('/api/orders', [
            'customer' => $this->customer($buyer),
            'items' => [[...$item, 'quantity' => 3]],
        ])->assertCreated();
        $this->assertSame(7, $product->fresh()->stock);
    }

    public function test_seller_can_reorder_and_remove_product_and_producer_photos(): void
    {
        Storage::fake('local');
        [$seller, , $product] = $this->sellerWithProduct(3, [
            ['name' => 'Size', 'options' => ['Small']],
        ]);
        $product->update([
            'variation_combinations' => [[
                'options' => [['name' => 'Size', 'value' => 'Small']],
                'price' => 80,
                'stock' => 3,
                'imageIndex' => 0,
            ]],
        ]);
        $images = [
            UploadedFile::fake()->image('tomatoes-a.jpg', 400, 400),
            UploadedFile::fake()->image('tomatoes-b.jpg', 400, 400),
        ];

        $this->actingAs($seller, 'sanctum')
            ->post("/api/seller/products/{$product->id}/media", ['images' => $images])
            ->assertOk()
            ->assertJsonPath('data.mediaCount', 2);

        $this->patchJson("/api/seller/products/{$product->id}/media/order", ['order' => [1, 0]])
            ->assertOk();
        $this->assertSame(1, $product->fresh()->variation_combinations[0]['imageIndex']);

        $this->deleteJson("/api/seller/products/{$product->id}/media/0")
            ->assertOk()
            ->assertJsonPath('data.mediaCount', 1);
        $this->assertSame(0, $product->fresh()->variation_combinations[0]['imageIndex']);

        $this->post("/api/seller/products/{$product->id}/producer-media", [
            'images' => [UploadedFile::fake()->image('producer.jpg', 400, 400)],
        ])->assertOk()->assertJsonCount(1, 'data.producerImages');

        $this->deleteJson("/api/seller/products/{$product->id}/producer-media/0")
            ->assertOk()
            ->assertJsonCount(0, 'data.producerImages');
    }
}
