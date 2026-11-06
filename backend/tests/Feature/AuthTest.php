<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_feature_tests_use_an_isolated_sqlite_database(): void
    {
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }

    public function test_a_buyer_can_register_then_sign_in(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Taylor Buyer',
            'email' => 'taylor@example.com',
            'phone' => '09123456789',
            'password' => 'secret-pass-123',
            'is_admin' => true,
        ])->assertCreated();

        $user = User::where('email', 'taylor@example.com')->firstOrFail();
        $this->assertSame('Taylor Buyer', $user->name);
        $this->assertSame('09123456789', $user->phone);
        $this->assertTrue(Hash::check('secret-pass-123', $user->password));
        $this->assertFalse($user->is_admin);

        $this->postJson('/api/auth/login', [
            'email' => 'taylor@example.com',
            'password' => 'secret-pass-123',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'is_admin']])
            ->assertJsonPath('user.is_admin', false);
    }

    public function test_sign_in_rejects_an_incorrect_password(): void
    {
        User::factory()->create([
            'email' => 'taylor@example.com',
            'password' => 'secret-pass-123',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'taylor@example.com',
            'password' => 'incorrect-pass',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_and_sign_in_normalize_email(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Taylor Buyer',
            'email' => '  Taylor@Example.com ',
            'phone' => '09123456789',
            'password' => 'secret-pass-123',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'taylor@example.com',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => ' TAYLOR@EXAMPLE.COM ',
            'password' => 'secret-pass-123',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_the_admin_account_is_bootstrapped_with_the_configured_password(): void
    {
        config([
            'admin.email' => 'admin_of_ecommerce@gmail.com',
            'admin.password' => 'admin-test-password',
        ]);

        $previousAdmin = User::factory()->create();
        $previousAdmin->forceFill(['is_admin' => true])->save();
        $this->seed(AdminUserSeeder::class);

        $this->assertFalse($previousAdmin->fresh()->is_admin);

        $admin = User::where('email', 'admin_of_ecommerce@gmail.com')->firstOrFail();
        $this->assertTrue($admin->is_admin);
        $this->assertTrue(Hash::check('admin-test-password', $admin->password));

        $login = $this->postJson('/api/auth/login', [
            'email' => 'admin_of_ecommerce@gmail.com',
            'password' => 'admin-test-password',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.is_admin', true);

        $this->withToken($login->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('is_admin', true);
    }

    public function test_registration_cannot_claim_the_reserved_admin_email(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Impersonator',
            'email' => 'admin_of_ecommerce@gmail.com',
            'phone' => '09123456789',
            'password' => 'secret-pass-123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_forgot_password_sends_a_reset_link_without_disclosing_unknown_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'taylor@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => ' TAYLOR@EXAMPLE.COM ',
        ])->assertOk()
            ->assertJsonPath('message', 'If an account exists for that email, a password reset link will be sent.');

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification): bool {
            $mail = $notification->toMail(new User(['email' => 'taylor@example.com']));

            return str_contains($mail->actionUrl, '/reset-password?')
                && str_contains($mail->actionUrl, 'email=taylor%40example.com');
        });

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'not-registered@example.com',
        ])->assertOk()->assertExactJson($response->json());
    }

    public function test_password_reset_changes_the_password_and_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'taylor@example.com',
            'password' => 'old-password-123',
        ]);
        $user->createToken('existing-session');
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $user->email,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'old-password-123',
        ])->assertUnprocessable();
    }

    public function test_password_reset_rejects_an_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'taylor@example.com']);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-reset-token',
            'email' => $user->email,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }
}
