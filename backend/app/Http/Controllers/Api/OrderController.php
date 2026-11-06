<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PlatformSetting;
use App\Models\ProductReview;
use App\Models\ReturnRequest;
use App\Models\SellerDiscount;
use App\Models\SellerProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    private const STATUSES = [
        'Order placed',
        'Preparing',
        'Ready to ship',
        'Shipped',
        'Out for delivery',
        'Delivered',
        'Cancelled',
    ];

    private const STATUS_NOTES = [
        'Order placed' => 'Your order has been received.',
        'Preparing' => 'The seller accepted your order and is preparing your items.',
        'Ready to ship' => 'Your order is packed and ready to ship.',
        'Shipped' => 'Your parcel has been handed to the delivery partner.',
        'Out for delivery' => 'The rider is bringing your order to you.',
        'Delivered' => 'Your order has been delivered.',
        'Cancelled' => 'Your order was cancelled.',
    ];

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()->with('returnRequest')->latest()->get();

        return response()->json(['data' => $orders->map(fn (Order $order) => $this->orderData($order))]);
    }

    public function buyerVouchers(Request $request): JsonResponse
    {
        $claimedIds = $request->user()->claimedDiscounts()->pluck('seller_discounts.id')->all();
        $vouchers = SellerDiscount::query()
            ->where('is_active', true)
            ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->where(fn ($query) => $query->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
            ->with('sellerApplication:id,shop_name')
            ->latest()
            ->get()
            ->map(fn (SellerDiscount $discount) => [
                'id' => $discount->id,
                'name' => $discount->name,
                'code' => $discount->code,
                'type' => $discount->type ?: 'percentage',
                'percentage' => $discount->percentage,
                'amount' => $discount->amount,
                'minimumSpend' => $discount->minimum_spend,
                'shop' => $discount->sellerApplication->shop_name,
                'claimed' => in_array($discount->id, $claimedIds),
                'endsAt' => $discount->ends_at,
            ]);

        return response()->json(['data' => $vouchers]);
    }

    public function claimVoucher(Request $request, SellerDiscount $discount): JsonResponse
    {
        $created = DB::transaction(function () use ($request, $discount): bool {
            $lockedDiscount = SellerDiscount::query()->lockForUpdate()->findOrFail($discount->id);
            if ($request->user()->claimedDiscounts()->whereKey($lockedDiscount->id)->exists()) {
                return false;
            }

            abort_unless(
                $lockedDiscount->is_active
                    && $lockedDiscount->sellerApplication()->where('status', 'approved')->exists()
                    && (! $lockedDiscount->starts_at || $lockedDiscount->starts_at->lte(now()))
                    && (! $lockedDiscount->ends_at || $lockedDiscount->ends_at->gte(now()))
                    && (! $lockedDiscount->max_uses || $lockedDiscount->uses < $lockedDiscount->max_uses),
                422,
                'This voucher is no longer available to claim.'
            );

            $request->user()->claimedDiscounts()->syncWithoutDetaching([$lockedDiscount->id]);

            return true;
        });

        return response()->json([
            'message' => $created ? 'Voucher claimed.' : 'Voucher already claimed.',
        ], $created ? 201 : 200);
    }

    public function show(Request $request, string $orderNumber): JsonResponse
    {
        $order = $request->user()->orders()->with('returnRequest')->where('order_number', $orderNumber)->firstOrFail();

        return response()->json(['data' => $this->orderData($order)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer.fullName' => ['required', 'string', 'max:120'],
            'customer.email' => ['required', 'email', 'max:255'],
            'customer.phone' => ['required', 'string', 'max:30'],
            'customer.address' => ['required', 'string', 'max:255'],
            'customer.barangay' => ['required', 'string', 'max:120'],
            'customer.city' => ['required', 'string', 'max:120'],
            'customer.postalCode' => ['required', 'string', 'max:12'],
            'customer.deliveryNotes' => ['nullable', 'string', 'max:500'],
            'customer.addressLabel' => ['nullable', 'string', 'max:40'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id' => ['required', 'string', 'regex:/^seller-[1-9][0-9]*$/'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.variations' => ['nullable', 'array', 'max:20'],
            'items.*.variations.*.name' => ['required', 'string', 'max:60'],
            'items.*.variations.*.value' => ['required', 'string', 'max:80'],
            'discountCode' => ['nullable', 'string', 'max:40'],
        ]);

        $orders = DB::transaction(function () use ($request, $validated): array {
            $settings = PlatformSetting::values();
            abort_if(
                $settings['buyer_verification_required'] && ! $request->user()->is_verified,
                403,
                'Verify your account before placing an order.'
            );
            $requestedLines = collect($validated['items'])->map(fn (array $item) => [
                'productId' => (int) substr($item['id'], strlen('seller-')),
                'quantity' => $item['quantity'],
                'variations' => $item['variations'] ?? [],
            ]);
            $requestedItems = $requestedLines->groupBy('productId')
                ->map(fn ($lines) => $lines->sum('quantity'));
            $products = SellerProduct::query()
                ->whereIn('id', $requestedItems->keys())
                ->where('is_active', true)
                ->where('admin_suspended', false)
                ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
                ->whereHas('sellerApplication.user', fn ($query) => $query->where('is_suspended', false))
                ->with('sellerApplication')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $requestedItems->count()) {
                abort(422, 'One or more products are no longer available.');
            }

            foreach ($requestedItems as $productId => $quantity) {
                $product = $products[$productId];
                $combinations = $product->variation_combinations ?? [];
                $details = $product->product_details ?? [];
                $minimumOrder = (int) ($details['minimumOrder'] ?? 1);
                $maximumOrder = isset($details['maximumOrder']) ? (int) $details['maximumOrder'] : null;
                abort_if($quantity < $minimumOrder, 422, "The minimum order for {$product->name} is {$minimumOrder}.");
                abort_if($maximumOrder !== null && $quantity > $maximumOrder, 422, "The maximum order for {$product->name} is {$maximumOrder}.");
                if ($product->stock < $quantity) {
                    abort(422, "There is not enough stock for {$products[$productId]->name}.");
                }
                $configured = $product->variations ?? [];
                foreach ($requestedLines->where('productId', $productId) as $line) {
                    $selected = collect($line['variations'])->keyBy('name');
                    abort_if($selected->count() !== count($configured), 422, 'Choose an option for each product variation.');
                    foreach ($configured as $variation) {
                        abort_unless(
                            $selected->has($variation['name'])
                                && in_array($selected[$variation['name']]['value'], $variation['options'], true),
                            422,
                            'One or more product variation options are invalid.'
                        );
                    }
                }
                if ($combinations) {
                    foreach ($requestedLines->where('productId', $productId)
                        ->groupBy(fn (array $line) => $this->variationKey($line['variations'])) as $lines) {
                        $variant = collect($combinations)->first(
                            fn (array $candidate) => $this->variationKey($candidate['options']) === $this->variationKey($lines->first()['variations'])
                        );
                        abort_unless($variant, 422, 'That product variation combination is unavailable.');
                        abort_if($variant['stock'] < $lines->sum('quantity'), 422, 'There is not enough stock for the selected variation.');
                    }
                }
            }

            $requestedLines = $requestedLines->map(function (array $line) use ($products): array {
                $product = $products[$line['productId']];
                $combinations = $product->variation_combinations ?? [];
                if ($combinations) {
                    $line['variant'] = collect($combinations)->first(
                        fn (array $candidate) => $this->variationKey($candidate['options']) === $this->variationKey($line['variations'])
                    );
                }

                return $line;
            });
            foreach ($requestedItems as $productId => $quantity) {
                $product = $products[$productId];
                $combinations = $product->variation_combinations ?? [];
                if (! $combinations) {
                    $product->decrement('stock', $quantity);
                    continue;
                }
                foreach ($requestedLines->where('productId', $productId)->groupBy(fn (array $line) => $this->variationKey($line['variations'])) as $key => $lines) {
                    $variantQuantity = $lines->sum('quantity');
                    foreach ($combinations as &$variant) {
                        if ($this->variationKey($variant['options']) === $key) {
                            $variant['stock'] -= $variantQuantity;
                            break;
                        }
                    }
                    unset($variant);
                }
                $product->update([
                    'variation_combinations' => $combinations,
                    'stock' => array_sum(array_column($combinations, 'stock')),
                ]);
            }

            $createdOrders = [];
            $manualDiscountApplied = false;
            foreach ($products->groupBy('seller_application_id') as $applicationProducts) {
                $items = $applicationProducts->flatMap(function (SellerProduct $product) use ($requestedItems, $requestedLines): array {
                    $totalQuantity = $requestedItems[$product->id];

                    return $requestedLines->where('productId', $product->id)->map(fn (array $line) => [
                        'id' => "seller-{$product->id}",
                        'name' => $product->name,
                        'category' => $product->category,
                        'price' => $line['variant']['price'] ?? $product->price,
                        'unit' => $product->unit,
                        'image' => isset($line['variant']['imageIndex'])
                            ? url("/api/marketplace/products/{$product->id}/media/{$line['variant']['imageIndex']}")
                            : ($product->product_media
                                ? url("/api/marketplace/products/{$product->id}/media/0")
                                : ($product->image_url ?: '/images/handwoven-basket.svg')),
                        'seller' => $product->sellerApplication->shop_name,
                        'sellerId' => $product->seller_application_id,
                        'quantity' => $line['quantity'],
                        'stock' => $line['variant']['stock'] ?? $product->stock + $totalQuantity,
                        'variations' => $line['variations'],
                        'variantSku' => $line['variant']['sku'] ?? null,
                    ])->all();
                })->values()->all();
                $now = now()->toISOString();
                $subtotal = collect($items)->sum(fn (array $item) => $item['price'] * $item['quantity']);
                $discount = null;
                if (! empty($validated['discountCode'])) {
                    $discount = SellerDiscount::query()
                        ->with('sellerApplication')
                        ->where('seller_application_id', $applicationProducts->first()->seller_application_id)
                        ->where('code', strtoupper($validated['discountCode']))
                        ->where('is_active', true)
                        ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                        ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
                        ->where(fn ($query) => $query->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
                        ->lockForUpdate()
                        ->first();
                    $manualDiscountApplied = $manualDiscountApplied || (bool) $discount;
                }
                if (! $discount && empty($validated['discountCode'])) {
                    $discount = $this->bestClaimedDiscountForSeller(
                        $request,
                        (int) $applicationProducts->first()->seller_application_id,
                        (float) $subtotal
                    );
                }
                $discountAmount = $discount ? $this->discountAmount($discount, (float) $subtotal, true) : 0;
                $shippingFee = (float) ($applicationProducts->first()->sellerApplication->application_data['shippingFee'] ?? $settings['default_shipping_fee']);

                $createdOrders[] = Order::create([
                    'order_number' => 'AF'.strtoupper(Str::random(10)),
                    'buyer_id' => $request->user()->id,
                    'seller_application_id' => $applicationProducts->first()->seller_application_id,
                    'customer' => [
                        ...$validated['customer'],
                        'addressLabel' => $validated['customer']['addressLabel'] ?? '',
                    ],
                    'items' => $items,
                    'subtotal' => $subtotal,
                    'shipping_fee' => $shippingFee,
                    'discount_code' => $discount?->code,
                    'discount_name' => $discount?->name,
                    'discount_amount' => $discountAmount,
                    'payment_method' => 'Cash on delivery',
                    'status' => self::STATUSES[0],
                    'tracking_history' => [[
                        'status' => self::STATUSES[0],
                        'at' => $now,
                        'note' => self::STATUS_NOTES[self::STATUSES[0]],
                    ]],
                ]);
                if ($discount) {
                    $discount->increment('uses');
                }
            }

            abort_if(! empty($validated['discountCode']) && ! $manualDiscountApplied, 422, 'The discount code is no longer valid for this order.');

            return $createdOrders;
        });

        return response()->json([
            'data' => collect($orders)->map(fn (Order $order) => $this->orderData($order)),
        ], 201);
    }

    public function requestReturn(Request $request, string $orderNumber): JsonResponse
    {
        $settings = PlatformSetting::values();
        abort_unless($settings['returns_enabled'], 403, 'Return requests are not available right now.');
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:3000'],
        ]);
        $order = $request->user()->orders()->where('order_number', $orderNumber)->firstOrFail();
        abort_unless($order->status === 'Delivered', 409, 'A return request can only be opened for a delivered order.');
        abort_if(
            $order->created_at->lt(now()->subDays((int) $settings['return_window_days'])),
            409,
            'The return request window for this order has expired.'
        );
        abort_if($order->returnRequest()->exists(), 409, 'A return request already exists for this order.');
        $returnRequest = $order->returnRequest()->create([
            'buyer_id' => $request->user()->id,
            'reason' => trim($validated['reason']),
            'description' => trim($validated['description']),
            'status' => 'pending',
        ]);

        return response()->json(['data' => [
            'id' => $returnRequest->id,
            'reason' => $returnRequest->reason,
            'description' => $returnRequest->description,
            'status' => $returnRequest->status,
        ]], 201);
    }

    public function reorder(Request $request, string $orderNumber): JsonResponse
    {
        $order = $request->user()->orders()->where('order_number', $orderNumber)->firstOrFail();
        $orderItems = collect($order->items);
        $quantities = $orderItems
            ->groupBy(fn (array $item) => (int) substr($item['id'], strlen('seller-')))
            ->map(fn ($items) => $items->sum('quantity'));
        $products = SellerProduct::query()
            ->whereIn('id', $quantities->keys())
            ->where('is_active', true)
            ->where('admin_suspended', false)
            ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
            ->whereHas('sellerApplication.user', fn ($query) => $query->where('is_suspended', false))
            ->with('sellerApplication')
            ->get()
            ->keyBy('id');
        $unavailable = [];
        $reorderItems = [];
        $variantQuantities = $orderItems
            ->groupBy(fn (array $item) => (int) substr($item['id'], strlen('seller-')))
            ->map(fn ($items) => $items
                ->groupBy(fn (array $item) => $this->variationKey($item['variations'] ?? []))
                ->map(fn ($variantItems) => $variantItems->sum('quantity')));

        foreach ($orderItems as $item) {
            $productId = (int) substr($item['id'], strlen('seller-'));
            $product = $products->get($productId);
            if (! $product || $product->stock < $quantities[$productId] || ! $this->validSavedVariations($item['variations'] ?? [], $product->variations ?? [])) {
                $unavailable[] = $item['name'];
                continue;
            }
            $details = $product->product_details ?? [];
            $minimumOrder = (int) ($details['minimumOrder'] ?? 1);
            $maximumOrder = isset($details['maximumOrder']) ? (int) $details['maximumOrder'] : null;
            if ($quantities[$productId] < $minimumOrder || ($maximumOrder !== null && $quantities[$productId] > $maximumOrder)) {
                $unavailable[] = $item['name'].' (order quantity limit changed)';
                continue;
            }
            $variant = null;
            if ($product->variation_combinations) {
                $variant = collect($product->variation_combinations)->first(
                    fn (array $candidate) => $this->variationKey($candidate['options']) === $this->variationKey($item['variations'] ?? [])
                );
                if (! $variant || $variant['stock'] < $variantQuantities[$productId][$this->variationKey($item['variations'] ?? [])]) {
                    $unavailable[] = $item['name'].' (selected variation unavailable)';
                    continue;
                }
            }

            $applicationData = $product->sellerApplication->application_data ?? [];
            $reorderItems[] = [
                'id' => "seller-{$product->id}",
                'name' => $product->name,
                'category' => $product->category,
                'price' => $variant['price'] ?? $product->price,
                'unit' => $product->unit,
                'image' => isset($variant['imageIndex'])
                    ? url("/api/marketplace/products/{$product->id}/media/{$variant['imageIndex']}")
                    : ($product->image_path
                        ? url("/api/marketplace/products/{$product->id}/image")
                        : ($product->image_url ?: '/images/handwoven-basket.svg')),
                'seller' => $product->sellerApplication->shop_name,
                'sellerId' => $product->seller_application_id,
                'shippingFee' => (float) ($applicationData['shippingFee'] ?? 60),
                'stock' => $variant['stock'] ?? $product->stock,
                'quantity' => $item['quantity'],
                'selectedVariations' => $item['variations'] ?? [],
                'variantSku' => $variant['sku'] ?? null,
                'variationImageIndex' => $variant['imageIndex'] ?? null,
            ];
        }

        return response()->json([
            'data' => [
                'items' => $reorderItems,
                'unavailable' => array_values(array_unique($unavailable)),
            ],
        ]);
    }

    private function validSavedVariations(array $selected, array $configured): bool
    {
        $selectedByName = collect($selected)->keyBy('name');
        if ($selectedByName->count() !== count($configured)) {
            return false;
        }

        foreach ($configured as $variation) {
            if (! $selectedByName->has($variation['name'])
                || ! in_array($selectedByName[$variation['name']]['value'], $variation['options'], true)) {
                return false;
            }
        }

        return true;
    }

    private function variationKey(array $options): string
    {
        return json_encode(collect($options)->sortBy('name')->values()->all(), JSON_THROW_ON_ERROR);
    }

    public function sellerOrders(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $orders = $application->orders()->with('buyer:id,name,email,phone')->latest()->get();

        return response()->json([
            'data' => $orders->map(fn (Order $order) => [
                ...$this->orderData($order),
                'buyer' => [
                    'id' => $order->buyer->id,
                    'name' => $order->buyer->name,
                    'email' => $order->buyer->email,
                    'phone' => $order->buyer->phone,
                ],
            ]),
        ]);
    }

    public function updateSellerStatus(Request $request, string $orderNumber): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $validated = $request->validate([
            'status' => ['required', Rule::in([...array_slice(self::STATUSES, 1, 5), 'Cancelled'])],
            'trackingNumber' => ['nullable', 'string', 'max:120'],
        ]);

        $order = DB::transaction(function () use ($application, $orderNumber, $validated): Order {
            $order = $application->orders()
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->firstOrFail();
            $currentIndex = array_search($order->status, self::STATUSES, true);

            if ($validated['status'] === 'Cancelled') {
                abort_unless(in_array($order->status, ['Order placed', 'Preparing', 'Ready to ship'], true), 409, 'This order can no longer be cancelled by the seller.');
                $this->restoreReservedInventory($order->items);
            } else {
                abort_unless(
                    $currentIndex !== false
                        && $currentIndex < count(self::STATUSES) - 1
                        && self::STATUSES[$currentIndex + 1] === $validated['status'],
                    409,
                    'This order cannot move to that status.'
                );
            }

            $order->update([
                'status' => $validated['status'],
                'tracking_number' => $validated['trackingNumber'] ?? $order->tracking_number,
                'tracking_history' => [
                    ...$order->tracking_history,
                    [
                        'status' => $validated['status'],
                        'at' => now()->toISOString(),
                        'note' => $validated['status'] === 'Cancelled'
                            ? 'Order cancelled by the seller; reserved inventory was released.'
                            : self::STATUS_NOTES[$validated['status']],
                    ],
                ],
            ]);

            return $order->fresh();
        });

        return response()->json(['data' => $this->orderData($order)]);
    }

    public function cancel(Request $request, string $orderNumber): JsonResponse
    {
        $order = DB::transaction(function () use ($request, $orderNumber): Order {
            $order = $request->user()->orders()
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($order->status === self::STATUSES[0], 409, 'Only newly placed orders can be cancelled.');

            $this->restoreReservedInventory($order->items);

            $order->update([
                'status' => 'Cancelled',
                'tracking_history' => [
                    ...$order->tracking_history,
                    [
                        'status' => 'Cancelled',
                        'at' => now()->toISOString(),
                        'note' => 'Order cancelled by the buyer.',
                    ],
                ],
            ]);

            return $order->fresh();
        });

        return response()->json(['data' => $this->orderData($order)]);
    }

    private function restoreReservedInventory(array $items): void
    {
        $groupedItems = collect($items)->groupBy(fn (array $item) =>
            (int) substr($item['id'], strlen('seller-'))
        );
        foreach ($groupedItems as $productId => $productItems) {
            $product = SellerProduct::query()->whereKey($productId)->lockForUpdate()->first();
            if (! $product) {
                continue;
            }
            $combinations = $product->variation_combinations ?? [];
            if (! $combinations) {
                $product->increment('stock', $productItems->sum('quantity'));
                continue;
            }
            foreach ($productItems->groupBy(fn (array $item) => $this->variationKey($item['variations'] ?? [])) as $key => $variantItems) {
                $found = false;
                foreach ($combinations as &$variant) {
                    if ($this->variationKey($variant['options']) === $key) {
                        $variant['stock'] += $variantItems->sum('quantity');
                        $found = true;
                        break;
                    }
                }
                unset($variant);
                abort_unless($found, 409, 'A variation in this order is no longer listed, so its reserved stock cannot be restored.');
            }
            $product->update([
                'variation_combinations' => $combinations,
                'stock' => array_sum(array_column($combinations, 'stock')),
            ]);
        }
    }

    private function approvedApplication(Request $request): \App\Models\SellerApplication
    {
        $application = $request->user()->sellerApplication()->first();
        abort_unless($application && $application->status === 'approved', 403, 'An approved seller account is required.');

        return $application;
    }

    private function orderData(Order $order): array
    {
        $order->loadMissing('returnRequest');

        return [
            'id' => $order->order_number,
            'placedAt' => $order->created_at,
            'customer' => $order->customer,
            'items' => $order->items,
            'subtotal' => $order->subtotal,
            'shippingFee' => $order->shipping_fee,
            'paymentMethod' => $order->payment_method,
            'status' => $order->status,
            'trackingHistory' => $order->tracking_history,
            'trackingNumber' => $order->tracking_number,
            'discountCode' => $order->discount_code,
            'discountName' => $order->discount_name,
            'discountAmount' => $order->discount_amount,
            'returnRequest' => $order->returnRequest ? [
                'id' => $order->returnRequest->id,
                'reason' => $order->returnRequest->reason,
                'description' => $order->returnRequest->description,
                'status' => $order->returnRequest->status,
                'adminNote' => $order->returnRequest->admin_note,
            ] : null,
            'reviews' => ProductReview::query()
                ->where('order_id', $order->id)
                ->pluck('seller_product_id')
                ->map(fn (int $productId) => "seller-{$productId}")
                ->values(),
        ];
    }

    public function validateDiscount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:40'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id' => ['required', 'string', 'regex:/^seller-[1-9][0-9]*$/'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);
        $productIds = collect($validated['items'])
            ->groupBy(fn (array $item) => (int) substr($item['id'], 7))
            ->map(fn ($group) => $group->sum('quantity'));
        $products = SellerProduct::query()
            ->whereIn('id', $productIds->keys())
            ->where('is_active', true)
            ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
            ->with('sellerApplication')
            ->get();
        abort_if($products->count() !== $productIds->count(), 422, 'One or more products are unavailable.');

        $sellerIds = $products->pluck('seller_application_id')->unique();
        $discountQuery = SellerDiscount::query()
            ->whereIn('seller_application_id', $sellerIds)
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->where(fn ($query) => $query->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
            ->with('sellerApplication');
        if (! empty($validated['code'])) {
            $discountQuery->where('code', strtoupper($validated['code']));
            $discounts = $discountQuery->get();
        } else {
            $discounts = $request->user()->claimedDiscounts()
                ->whereIn('seller_application_id', $sellerIds)
                ->where('is_active', true)
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
                ->where(fn ($query) => $query->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
                ->with('sellerApplication')
                ->get();
        }

        $eligible = $discounts->map(function (SellerDiscount $candidate) use ($products, $productIds): array {
            $eligibleSubtotal = $products
                ->where('seller_application_id', $candidate->seller_application_id)
                ->sum(fn (SellerProduct $product) => $product->price * $productIds[$product->id]);
            $amount = $eligibleSubtotal > 0
                ? $this->discountAmount($candidate, (float) $eligibleSubtotal)
                : null;

            return ['discount' => $candidate, 'subtotal' => $eligibleSubtotal, 'amount' => $amount];
        })->filter(fn (array $candidate) => $candidate['amount'] !== null);

        if (! empty($validated['code'])) {
            abort_unless($discounts->isNotEmpty(), 422, 'This discount code is invalid or expired.');
            $manualDiscount = $discounts->first();
            $manualSubtotal = $products
                ->where('seller_application_id', $manualDiscount->seller_application_id)
                ->sum(fn (SellerProduct $product) => $product->price * $productIds[$product->id]);
            abort_if($manualSubtotal <= 0, 422, 'This discount is not valid for the items in your cart.');
            $manualAmount = $this->discountAmount($manualDiscount, (float) $manualSubtotal, true);
            $eligible = collect([[
                'discount' => $manualDiscount,
                'subtotal' => $manualSubtotal,
                'amount' => $manualAmount,
            ]]);
        }
        $selected = $eligible->sortByDesc('amount')->first();
        if (! $selected) {
            return response()->json(['data' => null]);
        }
        /** @var SellerDiscount $discount */
        $discount = $selected['discount'];
        $eligibleSubtotal = $selected['subtotal'];
        $discountAmount = $selected['amount'];

        return response()->json([
            'data' => [
                'code' => $discount->code,
                'name' => $discount->name,
                'type' => $discount->type ?: 'percentage',
                'percentage' => $discount->percentage,
                'amount' => $discount->amount,
                'minimumSpend' => $discount->minimum_spend,
                'discountAmount' => $discountAmount,
                'eligibleSubtotal' => $eligibleSubtotal,
                'shop' => $discount->sellerApplication->shop_name,
            ],
        ]);
    }

    private function discountAmount(SellerDiscount $discount, float $eligibleSubtotal, bool $rejectBelowMinimum = false): ?float
    {
        $type = $discount->type ?: 'percentage';
        if ($type === 'minimum_spend') {
            $meetsMinimum = $eligibleSubtotal >= (float) $discount->minimum_spend;
            if ($rejectBelowMinimum) {
                abort_unless(
                    $meetsMinimum,
                    422,
                    'This discount requires an eligible spend of at least ₱'.number_format((float) $discount->minimum_spend, 2).'.'
                );
            } elseif (! $meetsMinimum) {
                return null;
            }
        }

        $amount = match ($type) {
            'percentage' => $eligibleSubtotal * $discount->percentage / 100,
            'fixed_amount', 'minimum_spend' => (float) $discount->amount,
            default => abort(422, 'This discount type is not supported.'),
        };

        return round(min($eligibleSubtotal, $amount), 2);
    }

    private function bestClaimedDiscountForSeller(Request $request, int $sellerApplicationId, float $subtotal): ?SellerDiscount
    {
        return $request->user()->claimedDiscounts()
            ->where('seller_application_id', $sellerApplicationId)
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->where(fn ($query) => $query->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'))
            ->lockForUpdate()
            ->get()
            ->filter(fn (SellerDiscount $discount) => $this->discountAmount($discount, $subtotal) !== null)
            ->sortByDesc(fn (SellerDiscount $discount) => $this->discountAmount($discount, $subtotal))
            ->first();
    }

    public function storeReview(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate([
            'productId' => ['required', 'string', 'regex:/^seller-[1-9][0-9]*$/'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
        ]);
        $order = $request->user()->orders()->where('order_number', $orderNumber)->firstOrFail();
        abort_unless($order->status === 'Delivered', 409, 'You can review products after delivery.');
        $productId = (int) substr($validated['productId'], 7);
        $item = collect($order->items)->firstWhere('id', "seller-{$productId}");
        abort_unless($item, 404, 'This product is not part of the order.');
        abort_if(
            ProductReview::query()
                ->where('order_id', $order->id)
                ->where('seller_product_id', $productId)
                ->where('buyer_id', $request->user()->id)
                ->exists(),
            409,
            'You have already reviewed this product.'
        );

        $review = ProductReview::create([
            'seller_application_id' => $order->seller_application_id,
            'seller_product_id' => $productId,
            'buyer_id' => $request->user()->id,
            'order_id' => $order->id,
            'rating' => $validated['rating'],
            'title' => $validated['title'] ?? null,
            'body' => $validated['body'],
        ]);

        return response()->json(['data' => ['id' => $review->id]], 201);
    }
}
