<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('admin.email');
        $password = config('admin.password');

        if (! is_string($password) || strlen($password) < 8) {
            throw new RuntimeException('Set ADMIN_PASSWORD to a password of at least 8 characters before seeding the administrator.');
        }

        DB::transaction(function () use ($email, $password): void {
            User::query()
                ->where('is_admin', true)
                ->whereRaw('LOWER(email) != ?', [$email])
                ->update(['is_admin' => false]);

            $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first()
                ?? new User;

            $user->forceFill([
                'name' => 'Administrator',
                'email' => $email,
                'password' => $password,
                'is_admin' => true,
            ])->save();
        });
    }
}
