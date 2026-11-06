<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SellerApplication;
use App\Models\SellerProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function application(User $user, array $details = []): SellerApplication
    {
        return SellerApplication::create([
            'user_id' => $user->id,
            'shop_name' => 'Sta Maria Test Shop',
            'category' => 'Local Products',
            'status' => 'approved',
            'application_data' => $details,
        ]);
    }

    private function product(SellerApplication $application): SellerProduct
    {
        return SellerProduct::create([
            'seller_application_id' => $application->id,
            'name' => 'Test Local Product',
            'category' => 'Local Products',
            'description' => 'A sample product for platform administration.',
            'price' => 100,
            'unit' => 'each',
            'stock' => 10,
            'is_active' => true,
        ]);
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

    private function order(User $buyer, SellerApplication $application, string $status = 'Delivered'): Order
    {
        return Order::create([
            'order_number' => 'AF'.strtoupper(fake()->unique()->bothify('##########')),
            'buyer_id' => $buyer->id,
            'seller_application_id' => $application->id,
            'customer' => $this->customer($buyer),
            'items' => [['id' => 'seller-1', 'name' => 'Test product', 'price' => 100, 'quantity' => 1]],
            'subtotal' => 100,
            'shipping_fee' => 60,
            'payment_method' => 'Cash on delivery',
            'status' => $status,
            'tracking_history' => [],
        ]);
    }

    public function test_admin_dashboard_and_governance_endpoints_are_restricted_to_admins(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();

        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.metrics.users', 1)
            ->assertJsonPath('data.settings.default_shipping_fee', 60)
            ->assertJsonPath('data.metrics.orders', 0);
    }

    public function test_admin_can_verify_and_suspend_a_buyer_and_suspension_revokes_access(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/accounts?search='.$buyer->email)
            ->assertOk()
            ->assertJsonPath('data.data.0.verified', false)
            ->assertJsonPath('data.data.0.suspended', false);

        $this->patchJson("/api/admin/accounts/{$buyer->id}", [
            'verified' => true,
            'suspended' => true,
            'suspensionReason' => 'Review required.',
        ])->assertOk()->assertJsonPath('data.verified', true)->assertJsonPath('data.suspended', true);

        $buyer->refresh();
        $this->actingAs($buyer, 'sanctum')->getJson('/api/orders')->assertForbidden();
        $this->postJson('/api/auth/login', ['email' => $buyer->email, 'password' => 'password'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/accounts/{$buyer->id}", [
            'verified' => true,
            'suspended' => false,
        ])->assertOk()->assertJsonPath('data.suspended', false);
        $buyer->refresh();
        $this->actingAs($buyer, 'sanctum')->getJson('/api/orders')->assertOk();
    }

    public function test_admin_can_restrict_and_restore_a_product_listing(): void
    {
        $admin = $this->admin();
        $seller = User::factory()->create();
        $application = $this->application($seller);
        $product = $this->product($application);

        $this->getJson('/api/marketplace/products')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/products/{$product->id}/moderation", [
                'suspended' => true,
                'reason' => 'Listing needs compliance review.',
            ])
            ->assertOk()
            ->assertJsonPath('data.suspended', true);
        $this->getJson('/api/marketplace/products')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/products?status=suspended')
            ->assertOk()
            ->assertJsonPath('data.data.0.moderationReason', 'Listing needs compliance review.');
        $this->patchJson("/api/admin/products/{$product->id}/moderation", ['suspended' => false])
            ->assertOk()
            ->assertJsonPath('data.suspended', false);
        $this->getJson('/api/marketplace/products')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_search_is_case_insensitive_across_accounts_products_and_transactions(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create(['name' => 'Marie Buyer']);
        $seller = User::factory()->create();
        $application = $this->application($seller);
        $this->product($application);
        $order = $this->order($buyer, $application);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/accounts?search=marie')
            ->assertOk()
            ->assertJsonPath('data.data.0.name', 'Marie Buyer');
        $this->getJson('/api/admin/products?search=TEST%20LOCAL%20PRODUCT')
            ->assertOk()
            ->assertJsonPath('data.data.0.name', 'Test Local Product');
        $this->getJson('/api/admin/transactions?search='.strtolower($order->order_number))
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $order->order_number);
    }

    public function test_platform_settings_control_buyer_verification_returns_and_shipping(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $application = $this->application($seller);
        $product = $this->product($application);

        $this->actingAs($admin, 'sanctum')->patchJson('/api/admin/settings', [
            'default_shipping_fee' => 25,
            'buyer_verification_required' => true,
            'returns_enabled' => true,
            'return_window_days' => 14,
            'suspicious_order_amount' => 5000,
            'support_email' => 'support@example.com',
        ])->assertOk();

        $payload = ['customer' => $this->customer($buyer), 'items' => [['id' => "seller-{$product->id}", 'quantity' => 1]]];
        $this->actingAs($buyer, 'sanctum')->postJson('/api/orders', $payload)->assertForbidden();

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/accounts/{$buyer->id}", [
            'verified' => true,
            'suspended' => false,
        ])->assertOk();
        $buyer->refresh();
        $created = $this->actingAs($buyer, 'sanctum')->postJson('/api/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('data.0.shippingFee', 25);
        $orderNumber = $created->json('data.0.id');
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();
        $order->update(['status' => 'Delivered']);

        $return = $this->postJson("/api/orders/{$orderNumber}/returns", [
            'reason' => 'Damaged item',
            'description' => 'The item arrived damaged and cannot be used.',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $adminReturn = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/returns?status=pending')
            ->assertOk()
            ->assertJsonPath('data.data.0.order.id', $orderNumber);
        $requestId = $adminReturn->json('data.data.0.id');
        $this->patchJson("/api/admin/returns/{$requestId}", [
            'status' => 'under_review',
            'adminNote' => 'We are checking the return request.',
        ])->assertOk();
        $this->patchJson("/api/admin/returns/{$requestId}", [
            'status' => 'approved',
            'adminNote' => 'Return approved. Refund must be arranged separately.',
        ])->assertOk();

        $this->actingAs($buyer, 'sanctum')->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('data.0.returnRequest.status', 'approved')
            ->assertJsonPath('data.0.returnRequest.adminNote', 'Return approved. Refund must be arranged separately.');

        $this->assertSame(1, $return->json('data.id'));
    }

    public function test_admin_can_download_a_transaction_report(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $application = $this->application($seller);
        $this->order($buyer, $application);

        $this->actingAs($admin, 'sanctum')
            ->get('/api/admin/transactions/report.csv')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
