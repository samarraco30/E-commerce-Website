<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_buyer_can_save_an_address_and_make_it_the_default(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/addresses', [
                'label' => 'Home',
                'fullName' => 'Taylor Buyer',
                'email' => 'taylor@example.com',
                'phone' => '09123456789',
                'address' => '12 Market Street',
                'barangay' => 'Poblacion',
                'city' => 'Sta. Maria',
                'postalCode' => '3022',
                'deliveryNotes' => 'Call on arrival',
            ])
            ->assertCreated()
            ->assertJsonPath('data.label', 'Home')
            ->assertJsonPath('data.isDefault', true);

        $this->assertDatabaseHas('delivery_addresses', [
            'user_id' => $user->id,
            'label' => 'Home',
            'full_name' => 'Taylor Buyer',
            'postal_code' => '3022',
            'is_default' => true,
        ]);
    }

    public function test_a_buyer_can_save_an_address_with_their_login_token(): void
    {
        $user = User::factory()->create([
            'email' => 'taylor@example.com',
            'password' => 'secret-pass-123',
        ]);

        $login = $this->postJson('/api/auth/login', [
            'email' => 'taylor@example.com',
            'password' => 'secret-pass-123',
        ])->assertOk();

        $token = $login->json('token');

        $this->withToken($token)
            ->postJson('/api/addresses', [
                'label' => 'Home',
                'fullName' => 'Taylor Buyer',
                'email' => 'taylor@example.com',
                'phone' => '09123456789',
                'address' => '12 Market Street',
                'barangay' => 'Poblacion',
                'city' => 'Sta. Maria',
                'postalCode' => '3022',
            ])
            ->assertCreated()
            ->assertJsonPath('data.fullName', 'Taylor Buyer');

        $this->assertDatabaseHas('delivery_addresses', [
            'user_id' => $user->id,
            'label' => 'Home',
        ]);
    }

    public function test_a_buyer_cannot_read_or_change_another_buyers_address(): void
    {
        $owner = User::factory()->create();
        $otherBuyer = User::factory()->create();
        $address = $owner->deliveryAddresses()->create([
            'label' => 'Home',
            'full_name' => 'Taylor Buyer',
            'email' => 'taylor@example.com',
            'phone' => '09123456789',
            'address' => '12 Market Street',
            'barangay' => 'Poblacion',
            'city' => 'Sta. Maria',
            'postal_code' => '3022',
            'is_default' => true,
        ]);

        $this->actingAs($otherBuyer, 'sanctum')
            ->patchJson("/api/addresses/{$address->id}", ['label' => 'Not mine'])
            ->assertNotFound();

        $this->assertDatabaseHas('delivery_addresses', [
            'id' => $address->id,
            'label' => 'Home',
            'user_id' => $owner->id,
        ]);
    }

    public function test_buyer_can_change_default_and_removing_default_promotes_another_address(): void
    {
        $user = User::factory()->create();
        $firstAddress = $user->deliveryAddresses()->create([
            'label' => 'Home',
            'full_name' => 'Taylor Buyer',
            'email' => 'taylor@example.com',
            'phone' => '09123456789',
            'address' => '12 Market Street',
            'barangay' => 'Poblacion',
            'city' => 'Sta. Maria',
            'postal_code' => '3022',
            'is_default' => true,
        ]);
        $secondAddress = $user->deliveryAddresses()->create([
            'label' => 'Work',
            'full_name' => 'Taylor Buyer',
            'email' => 'taylor@example.com',
            'phone' => '09123456789',
            'address' => '20 Town Road',
            'barangay' => 'Bagbaguin',
            'city' => 'Sta. Maria',
            'postal_code' => '3022',
            'is_default' => false,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/addresses/{$secondAddress->id}", ['isDefault' => true])
            ->assertOk()
            ->assertJsonPath('data.isDefault', true);

        $this->assertDatabaseHas('delivery_addresses', [
            'id' => $firstAddress->id,
            'is_default' => false,
        ]);

        $this->deleteJson("/api/addresses/{$secondAddress->id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $firstAddress->id)
            ->assertJsonPath('data.0.isDefault', true);
    }

    public function test_saved_addresses_require_authentication(): void
    {
        $this->getJson('/api/addresses')->assertUnauthorized();
    }
}
