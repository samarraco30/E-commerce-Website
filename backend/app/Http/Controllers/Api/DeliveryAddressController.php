<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryAddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->deliveryAddresses()
                ->orderByDesc('is_default')
                ->orderBy('created_at')
                ->get()
                ->map(fn (DeliveryAddress $address) => $this->present($address)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:40'],
            'fullName' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'postalCode' => ['required', 'string', 'max:12'],
            'deliveryNotes' => ['nullable', 'string', 'max:500'],
            'isDefault' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $address = DB::transaction(function () use ($validated, $user) {
            $isDefault = ! $user->deliveryAddresses()->exists()
                || ($validated['isDefault'] ?? false);

            if ($isDefault) {
                $user->deliveryAddresses()->update(['is_default' => false]);
            }

            return $user->deliveryAddresses()->create([
                'label' => $validated['label'],
                'full_name' => $validated['fullName'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'postal_code' => $validated['postalCode'],
                'delivery_notes' => $validated['deliveryNotes'] ?? null,
                'is_default' => $isDefault,
            ]);
        });

        return response()->json([
            'data' => $this->present($address),
        ], 201);
    }

    public function update(Request $request, int $address): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:40'],
            'isDefault' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $deliveryAddress = $user->deliveryAddresses()->findOrFail($address);

        DB::transaction(function () use ($validated, $user, $deliveryAddress) {
            if (array_key_exists('label', $validated)) {
                $deliveryAddress->label = $validated['label'];
            }

            if (($validated['isDefault'] ?? false) === true) {
                $user->deliveryAddresses()->update(['is_default' => false]);
                $deliveryAddress->is_default = true;
            } elseif (array_key_exists('isDefault', $validated)) {
                $deliveryAddress->is_default = false;
            }

            $deliveryAddress->save();
        });

        return response()->json([
            'data' => $this->present($deliveryAddress->refresh()),
        ]);
    }

    public function destroy(Request $request, int $address): JsonResponse
    {
        $user = $request->user();
        $deliveryAddress = $user->deliveryAddresses()->findOrFail($address);
        $wasDefault = $deliveryAddress->is_default;

        DB::transaction(function () use ($deliveryAddress, $user, $wasDefault) {
            $deliveryAddress->delete();

            if ($wasDefault) {
                $nextAddress = $user->deliveryAddresses()
                    ->orderBy('created_at')
                    ->first();

                if ($nextAddress) {
                    $nextAddress->update(['is_default' => true]);
                }
            }
        });

        return response()->json([
            'data' => $user->deliveryAddresses()
                ->orderByDesc('is_default')
                ->orderBy('created_at')
                ->get()
                ->map(fn (DeliveryAddress $item) => $this->present($item)),
        ]);
    }

    private function present(DeliveryAddress $address): array
    {
        return [
            'id' => $address->id,
            'label' => $address->label,
            'fullName' => $address->full_name,
            'email' => $address->email,
            'phone' => $address->phone,
            'address' => $address->address,
            'barangay' => $address->barangay,
            'city' => $address->city,
            'postalCode' => $address->postal_code,
            'deliveryNotes' => $address->delivery_notes ?? '',
            'isDefault' => $address->is_default,
        ];
    }
}
