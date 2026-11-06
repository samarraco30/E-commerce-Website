<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $email = $request->input('email');
        if (is_string($email)) {
            $request->merge(['email' => strtolower(trim($email))]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
                Rule::notIn([config('admin.email')]),
            ],
            'phone' => ['required', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        User::create($validated);

        return response()->json([
            'message' => 'Account created successfully. Please sign in.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $email = $request->input('email');
        if (is_string($email)) {
            $request->merge(['email' => strtolower(trim($email))]);
        }

        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [$credentials['email']])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }
        abort_if(! $user->is_admin && $user->is_suspended, 403, 'This account has been suspended. Contact marketplace support.');

        return response()->json([
            'token' => $user->createToken('buyer-web')->plainTextToken,
            'user' => $this->userData($user),
        ]);
    }

    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        Password::sendResetLink([
            'email' => strtolower(trim($validated['email'])),
        ]);

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link will be sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string', 'same:password'],
        ]);

        $status = Password::reset(
            [
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid or has expired. Request a new link and try again.'],
            ]);
        }

        return response()->json([
            'message' => 'Your password has been reset. You can now sign in with your new password.',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($this->userData($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Signed out successfully.',
        ]);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) $user->is_admin,
            'is_verified' => (bool) $user->is_verified,
            'is_suspended' => (bool) $user->is_suspended,
        ];
    }
}
