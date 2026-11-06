<?php

namespace Tests\Feature;

use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerApplicationTest extends TestCase
{
    use RefreshDatabase;

    private function applicationPayload(): array
    {
        return [
            'shopName' => 'Sta Maria Farm Shop',
            'category' => 'Agricultural Products',
            'businessName' => 'Sta Maria Farm Shop',
            'registrationType' => 'dti',
            'registrationNumber' => 'DTI-12345',
            'businessAddress' => '12 Market Road',
            'businessBarangay' => 'Poblacion',
            'businessCity' => 'Sta. Maria',
            'shopPhone' => '09123456789',
            'shopEmail' => 'shop@example.com',
            'shopeeAccount' => 'farmshop',
            'pickupAddress' => '12 Market Road',
            'pickupBarangay' => 'Poblacion',
            'pickupCity' => 'Sta. Maria',
            'payoutAccountName' => 'Taylor Buyer',
            'payoutBank' => 'Example Bank',
            'payoutAccountNumber' => '1234567890',
        ];
    }

    public function test_buyer_can_submit_a_private_seller_application(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/seller/application', [
                ...$this->applicationPayload(),
                'governmentId' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nID"),
                'proofBusinessAddress' => UploadedFile::fake()->createWithContent('address.pdf', "%PDF-1.4\nAddress"),
                'businessRegistration' => UploadedFile::fake()->createWithContent('registration.pdf', "%PDF-1.4\nRegistration"),
                'mayorPermit' => UploadedFile::fake()->createWithContent('permit.pdf', "%PDF-1.4\nPermit"),
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.shopName', 'Sta Maria Farm Shop')
            ->assertJsonPath('data.details.payoutAccountNumber', '1234567890')
            ->assertJsonPath('data.documents.governmentId', true);

        $application = SellerApplication::firstOrFail();
        $this->assertSame('pending', $application->status);
        $this->assertNotSame(
            '1234567890',
            $application->getRawOriginal('application_data')
        );
        Storage::disk('local')->assertExists($application->documents['governmentId']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/seller/application', $this->applicationPayload())
            ->assertConflict();
    }

    public function test_only_an_administrator_can_approve_a_seller_application(): void
    {
        $applicant = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $applicant->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'pending',
            'application_data' => $this->applicationPayload(),
        ]);
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer, 'sanctum')
            ->patchJson("/api/admin/seller-applications/{$application->id}", [
                'status' => 'approved',
            ])
            ->assertForbidden();

        $reviewer->forceFill(['is_admin' => true])->save();
        $this->actingAs($reviewer, 'sanctum')
            ->patchJson("/api/admin/seller-applications/{$application->id}", [
                'status' => 'approved',
                'reviewerNote' => 'Approved.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->actingAs($applicant, 'sanctum')
            ->getJson('/api/seller/dashboard')
            ->assertOk()
            ->assertJsonPath('metrics.products', 0);
    }

    public function test_approved_seller_can_manage_marketplace_products(): void
    {
        $user = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $user->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'approved',
            'application_data' => $this->applicationPayload(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Fresh Tomatoes',
                'category' => 'Agricultural Products',
                'description' => 'Locally grown tomatoes.',
                'price' => 80,
                'unit' => 'per kilo',
                'stock' => 12,
                'isActive' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Fresh Tomatoes');

        $this->getJson('/api/marketplace/products')
            ->assertOk()
            ->assertJsonPath('data.0.seller', 'Farm Shop')
            ->assertJsonPath('data.0.stock', 12);

        $this->assertDatabaseHas('seller_products', [
            'seller_application_id' => $application->id,
            'name' => 'Fresh Tomatoes',
            'stock' => 12,
        ]);
    }

    public function test_an_unapproved_seller_cannot_list_products(): void
    {
        $user = User::factory()->create();
        SellerApplication::create([
            'user_id' => $user->id,
            'shop_name' => 'Pending Shop',
            'category' => 'Handicrafts',
            'status' => 'pending',
            'application_data' => $this->applicationPayload(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Basket',
                'category' => 'Handicrafts',
                'description' => 'Handwoven basket.',
                'price' => 250,
                'unit' => 'per piece',
                'stock' => 3,
            ])
            ->assertForbidden();
    }

    public function test_seller_application_routes_require_authentication(): void
    {
        $this->getJson('/api/seller/application')->assertUnauthorized();
        $this->postJson('/api/seller/application', $this->applicationPayload())->assertUnauthorized();
    }

    public function test_uploaded_documents_are_only_available_to_administrators(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $application = SellerApplication::create([
            'user_id' => $user->id,
            'shop_name' => 'Farm Shop',
            'category' => 'Agricultural Products',
            'status' => 'pending',
            'application_data' => $this->applicationPayload(),
            'documents' => ['governmentId' => 'seller-applications/1/id.pdf'],
        ]);
        Storage::disk('local')->put('seller-applications/1/id.pdf', '%PDF-1.4 private');

        $this->actingAs($user, 'sanctum')
            ->get("/api/admin/seller-applications/{$application->id}/documents/governmentId")
            ->assertForbidden();

        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();
        $this->actingAs($admin, 'sanctum')
            ->get("/api/admin/seller-applications/{$application->id}/documents/governmentId")
            ->assertOk()
            ->assertStreamedContent('%PDF-1.4 private');
    }

    public function test_local_testing_can_activate_a_seller_without_an_application(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        $user = User::factory()->create([
            'name' => 'Taylor Buyer',
            'email' => 'taylor@example.com',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/seller/application')
            ->assertOk()
            ->assertJsonPath('data', null)
            ->assertJsonPath('testingAvailable', true);

        $this->postJson('/api/seller/test-activate')
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.shopName', 'Taylor Buyer Test Shop');

        $this->getJson('/api/seller/dashboard')
            ->assertOk()
            ->assertJsonPath('shop.name', 'Taylor Buyer Test Shop');

        $this->assertDatabaseHas('seller_applications', [
            'user_id' => $user->id,
            'status' => 'approved',
            'reviewer_note' => 'Activated using the local-only test shortcut.',
        ]);
    }

    public function test_local_test_activation_is_not_available_outside_local_environment(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/seller/application')
            ->assertOk()
            ->assertJsonPath('testingAvailable', false);

        $this->postJson('/api/seller/test-activate')->assertNotFound();

        $this->assertDatabaseMissing('seller_applications', [
            'user_id' => $user->id,
        ]);
    }
}
