<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SellerApplication;
use App\Models\SellerProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_orders_are_persisted_and_only_the_seller_can_accept_them(): void
    {
        $buyer = User::factory()->create();
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
            'stock' => 5,
            'is_active' => true,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders', [
                'customer' => [
                    'fullName' => 'Buyer Example',
                    'email' => $buyer->email,
                    'phone' => '09123456789',
                    'address' => '12 Market Road',
                    'barangay' => 'Poblacion',
                    'city' => 'Sta. Maria',
                    'postalCode' => '3022',
                ],
                'items' => [['id' => "seller-{$product->id}", 'quantity' => 2, 'price' => 1]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.0.status', 'Order placed')
            ->assertJsonPath('data.0.subtotal', 160);

        $order = Order::firstOrFail();
        $this->assertSame(3, $product->fresh()->stock);

        $otherBuyer = User::factory()->create();
        $this->actingAs($otherBuyer, 'sanctum')
            ->getJson("/api/orders/{$order->order_number}")
            ->assertNotFound();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/orders')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->order_number)
            ->assertJsonPath('data.0.customer.fullName', 'Buyer Example');

        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/seller/orders/{$order->order_number}/status", [
                'status' => 'Preparing',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Preparing');

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'Preparing');
    }

    public function test_seller_cannot_update_an_order_belonging_to_another_shop(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $otherSeller = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $seller->id,
            'shop_name' => 'Original Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Original Shop'],
        ]);
        SellerApplication::create([
            'user_id' => $otherSeller->id,
            'shop_name' => 'Different Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Different Shop'],
        ]);
        $order = Order::create([
            'order_number' => 'AFTESTORDER01',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => ['fullName' => 'Buyer Example'],
            'items' => [],
            'subtotal' => 0,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => 'Order placed',
            'tracking_history' => [],
        ]);

        $this->actingAs($otherSeller, 'sanctum')
            ->patchJson("/api/seller/orders/{$order->order_number}/status", [
                'status' => 'Preparing',
            ])
            ->assertNotFound();
    }

    public function test_buyer_can_cancel_a_new_order_and_restore_inventory(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $seller->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Farm Shop'],
        ]);
        $product = SellerProduct::create([
            'seller_application_id' => $application->id,
            'name' => 'Fresh Tomatoes',
            'category' => 'Agricultural Products',
            'description' => 'Locally grown tomatoes.',
            'price' => 80,
            'unit' => 'per kilo',
            'stock' => 3,
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'AFTESTORDER02',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => ['fullName' => 'Buyer Example'],
            'items' => [['id' => "seller-{$product->id}", 'quantity' => 2]],
            'subtotal' => 160,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => 'Order placed',
            'tracking_history' => [],
        ]);
        $product->decrement('stock', 2);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/orders/{$order->order_number}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'Cancelled');

        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_seller_can_cancel_a_pre_shipment_order_and_release_reserved_stock(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $seller->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Farm Shop'],
        ]);
        $product = SellerProduct::create([
            'seller_application_id' => $application->id,
            'name' => 'Fresh Tomatoes',
            'category' => 'Agricultural Products',
            'description' => 'Locally grown tomatoes.',
            'price' => 80,
            'unit' => 'per kilo',
            'stock' => 3,
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'AFTESTORDER03',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => ['fullName' => 'Buyer Example'],
            'items' => [['id' => "seller-{$product->id}", 'quantity' => 2]],
            'subtotal' => 160,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => 'Preparing',
            'tracking_history' => [],
        ]);
        $product->decrement('stock', 2);

        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/seller/orders/{$order->order_number}/status", [
                'status' => 'Cancelled',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Cancelled');

        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_buyer_can_reorder_available_items_using_current_product_details(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $seller->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => ['shopName' => 'Farm Shop'],
        ]);
        $product = SellerProduct::create([
            'seller_application_id' => $application->id,
            'name' => 'Fresh Tomatoes',
            'category' => 'Agricultural Products',
            'description' => 'Locally grown tomatoes.',
            'price' => 95,
            'unit' => 'per kilo',
            'stock' => 5,
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'AFREORDER001',
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => ['fullName' => $buyer->name],
            'items' => [[
                'id' => "seller-{$product->id}",
                'name' => 'Old product name',
                'price' => 80,
                'quantity' => 2,
                'variations' => [],
            ]],
            'subtotal' => 160,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => 'Delivered',
            'tracking_history' => [],
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$order->order_number}/reorder")
            ->assertOk()
            ->assertJsonPath('data.items.0.id', "seller-{$product->id}")
            ->assertJsonPath('data.items.0.name', 'Fresh Tomatoes')
            ->assertJsonPath('data.items.0.price', 95)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.unavailable', []);

        $otherBuyer = User::factory()->create();
        $this->actingAs($otherBuyer, 'sanctum')
            ->postJson("/api/orders/{$order->order_number}/reorder")
            ->assertNotFound();
    }
}
