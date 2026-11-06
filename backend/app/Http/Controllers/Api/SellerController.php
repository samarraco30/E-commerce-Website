<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductReview;
use App\Models\SellerDiscount;
use App\Models\SellerApplication;
use App\Models\SellerProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SellerController extends Controller
{
    private const CATEGORIES = [
        'Agricultural Products',
        'Food & Beverages',
        'Local Delicacies',
        'Handicrafts',
        'Poultry & Chicken',
        'Pasalubong',
    ];

    private const DOCUMENT_FIELDS = [
        'governmentId',
        'proofBusinessAddress',
        'leaseContract',
        'locationSketch',
        'businessRegistration',
        'mayorPermit',
        'barangayClearance',
        'zoningClearance',
        'fireSafetyCertificate',
        'occupancyPermit',
        'sanitaryPermit',
    ];

    public function application(Request $request): JsonResponse
    {
        $application = $request->user()->sellerApplication()->first();

        return response()->json([
            'data' => $application ? $this->applicationData($application) : null,
            'testingAvailable' => app()->environment('local'),
        ]);
    }

    public function activateTestSeller(Request $request): JsonResponse
    {
        abort_unless(app()->environment('local'), 404);

        $user = $request->user();
        $application = $user->sellerApplication()->first();
        $shopName = mb_substr(trim($user->name).' Test Shop', 0, 120);
        $details = [
            'shopName' => $shopName,
            'category' => 'Agricultural Products',
            'businessName' => $shopName,
            'registrationType' => 'dti',
            'registrationNumber' => 'TEST-ONLY',
            'businessAddress' => 'Test address',
            'businessBarangay' => 'Poblacion',
            'businessCity' => 'Sta. Maria',
            'shopPhone' => $user->phone ?: '0000000000',
            'shopEmail' => $user->email,
            'shopeeAccount' => 'Local test account',
            'pickupAddress' => 'Test pickup address',
            'pickupBarangay' => 'Poblacion',
            'pickupCity' => 'Sta. Maria',
            'payoutAccountName' => $user->name,
            'payoutBank' => 'Test only',
            'payoutAccountNumber' => 'TEST-ONLY',
        ];

        if ($application) {
            $application->update([
                'shop_name' => $shopName,
                'category' => 'Agricultural Products',
                'status' => 'approved',
                'application_data' => $details,
                'documents' => [],
                'reviewer_note' => 'Activated using the local-only test shortcut.',
                'reviewed_by' => null,
                'reviewed_at' => now(),
            ]);
        } else {
            $application = SellerApplication::create([
                'user_id' => $user->id,
                'shop_name' => $shopName,
                'category' => 'Agricultural Products',
                'status' => 'approved',
                'application_data' => $details,
                'documents' => [],
                'reviewer_note' => 'Activated using the local-only test shortcut.',
                'reviewed_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Test seller activated. This shortcut is only available in local development.',
            'data' => $this->applicationData($application->fresh()),
        ]);
    }

    public function submitApplication(Request $request): JsonResponse
    {
        $existing = $request->user()->sellerApplication()->first();
        abort_if($existing && $existing->status !== 'rejected', 409, 'An application is already being reviewed or approved.');

        $validated = $request->validate([
            'shopName' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'businessName' => ['required', 'string', 'max:180'],
            'registrationType' => ['required', Rule::in(['dti', 'sec'])],
            'registrationNumber' => ['required', 'string', 'max:120'],
            'businessAddress' => ['required', 'string', 'max:255'],
            'businessBarangay' => ['required', 'string', 'max:120'],
            'businessCity' => ['required', 'string', 'max:120'],
            'shopPhone' => ['required', 'string', 'max:30'],
            'shopEmail' => ['required', 'email', 'max:255'],
            'shopeeAccount' => ['required', 'string', 'max:180'],
            'pickupAddress' => ['required', 'string', 'max:255'],
            'pickupBarangay' => ['required', 'string', 'max:120'],
            'pickupCity' => ['required', 'string', 'max:120'],
            'payoutAccountName' => ['required', 'string', 'max:180'],
            'payoutBank' => ['required', 'string', 'max:120'],
            'payoutAccountNumber' => ['required', 'string', 'max:120'],
            ...collect(self::DOCUMENT_FIELDS)->mapWithKeys(function (string $field) use ($existing) {
                $requiredDocuments = ['governmentId', 'proofBusinessAddress', 'businessRegistration', 'mayorPermit'];
                $required = in_array($field, $requiredDocuments, true)
                    && empty($existing?->documents[$field]);

                return [
                    $field => [$required ? 'required' : 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
                ];
            })->all(),
        ]);

        $application = DB::transaction(function () use ($request, $existing, $validated) {
            $details = collect($validated)
                ->except(self::DOCUMENT_FIELDS)
                ->all();

            if ($existing) {
                $existing->update([
                    'shop_name' => $validated['shopName'],
                    'category' => $validated['category'],
                    'status' => 'pending',
                    'application_data' => $details,
                    'reviewer_note' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                ]);

                return $existing->fresh();
            }

            return SellerApplication::create([
                'user_id' => $request->user()->id,
                'shop_name' => $validated['shopName'],
                'category' => $validated['category'],
                'status' => 'pending',
                'application_data' => $details,
            ]);
        });

        $documents = $application->documents ?? [];
        foreach (self::DOCUMENT_FIELDS as $field) {
            if (! $request->hasFile($field)) {
                continue;
            }

            $path = $request->file($field)->store("seller-applications/{$application->id}");
            if (! $path) {
                abort(500, "The {$field} document could not be saved.");
            }
            $documents[$field] = $path;
        }

        $application->update(['documents' => $documents]);

        return response()->json([
            'message' => 'Your seller application has been submitted for review.',
            'data' => $this->applicationData($application->fresh()),
        ], $existing ? 200 : 201);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $products = $application->products()->latest()->get();
        $orders = $application->orders()->latest()->get();
        $activeOrders = $orders->reject(fn ($order) => in_array($order->status, ['Cancelled', 'Returned', 'Refunded'], true));
        $monthlySales = collect(range(5, 0))->map(function (int $monthsAgo) use ($application) {
            $month = now()->startOfMonth()->subMonths($monthsAgo);
            $revenue = $application->orders()
                ->whereNotIn('status', ['Cancelled', 'Returned', 'Refunded'])
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum(DB::raw('subtotal - discount_amount'));

            return ['month' => $month->format('M Y'), 'revenue' => (float) $revenue];
        });
        $productSales = [];
        foreach ($activeOrders as $order) {
            foreach ($order->items as $item) {
                $productId = (string) ($item['id'] ?? '');
                $productSales[$productId] = ($productSales[$productId] ?? 0) + (int) ($item['quantity'] ?? 0);
            }
        }
        $soldProducts = $products->map(fn (SellerProduct $product) => [
            'name' => $product->name,
            'sold' => $productSales["seller-{$product->id}"] ?? 0,
            'revenue' => ($productSales["seller-{$product->id}"] ?? 0) * $product->price,
        ]);
        $revenue = (float) $activeOrders->sum(fn ($order) => $order->subtotal - $order->discount_amount);
        $salesSince = fn ($date) => (float) $application->orders()
            ->whereNotIn('status', ['Cancelled', 'Returned', 'Refunded'])
            ->where('created_at', '>=', $date)
            ->sum(DB::raw('subtotal - discount_amount'));

        return response()->json([
            'shop' => [
                'id' => $application->id,
                'name' => $application->shop_name,
                'category' => $application->category,
            ],
            'products' => $products->map(fn (SellerProduct $product) => $this->productData($product)),
            'metrics' => [
                'products' => $products->count(),
                'activeProducts' => $products->where('is_active', true)->count(),
                'inventoryUnits' => $products->sum('stock'),
                'lowStockProducts' => $products->where('stock', '<=', 5)->count(),
                'revenue' => $revenue,
                'orders' => $orders->count(),
                'pendingOrders' => $orders->whereIn('status', ['Order placed', 'Preparing', 'Ready to ship'])->count(),
                'completedOrders' => $orders->where('status', 'Delivered')->count(),
                'cancelledOrders' => $orders->where('status', 'Cancelled')->count(),
                'monthlySales' => $monthlySales,
                'dailySales' => $salesSince(now()->startOfDay()),
                'weeklySales' => $salesSince(now()->startOfWeek()),
                'currentMonthSales' => $salesSince(now()->startOfMonth()),
                'bestSellingProducts' => $soldProducts->sortByDesc('sold')->take(5)->values(),
                'leastSellingProducts' => $soldProducts->sortBy('sold')->take(5)->values(),
                'customers' => $orders->pluck('buyer_id')->unique()->count(),
                'averageOrderValue' => $activeOrders->count() ? (float) $activeOrders->avg(fn ($order) => $order->subtotal - $order->discount_amount) : 0,
                'availableBalance' => 0,
                'pendingPayments' => (float) $orders->whereNotIn('status', ['Delivered', 'Cancelled', 'Returned', 'Refunded'])->sum(fn ($order) => $order->subtotal - $order->discount_amount),
                'completedPayouts' => 0,
                'platformFees' => 0,
            ],
        ]);
    }

    public function updateShop(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $validated = $request->validate([
            'shopName' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'shopPhone' => ['required', 'string', 'max:30'],
            'shopEmail' => ['required', 'email', 'max:255'],
            'pickupAddress' => ['required', 'string', 'max:255'],
            'pickupBarangay' => ['required', 'string', 'max:120'],
            'pickupCity' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'logoUrl' => ['nullable', 'url', 'max:2048'],
            'bannerUrl' => ['nullable', 'url', 'max:2048'],
            'shippingPolicy' => ['nullable', 'string', 'max:2000'],
            'returnPolicy' => ['nullable', 'string', 'max:2000'],
            'payoutAccountName' => ['nullable', 'string', 'max:180'],
            'payoutBank' => ['nullable', 'string', 'max:120'],
            'payoutAccountNumber' => ['nullable', 'string', 'max:120'],
            'shippingFee' => ['nullable', 'numeric', 'min:0', 'max:99999'],
        ]);
        $details = array_replace($application->application_data, $validated);
        $application->update([
            'shop_name' => $validated['shopName'],
            'category' => $validated['category'],
            'application_data' => $details,
        ]);

        return response()->json(['data' => $this->applicationData($application->fresh())]);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $product = $application->products()->create($this->validateProduct($request, $application));

        return response()->json(['data' => $this->productData($product)], 201);
    }

    public function updateProduct(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $product->update($this->validateProduct($request, $application, $product));

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function deleteProduct(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        Storage::disk('local')->delete(array_filter([
            $product->image_path,
            $product->video_path,
            ...($product->product_media ?? []),
            ...($product->producer_media ?? []),
        ]));
        $product->delete();

        return response()->json(['message' => 'Product removed.']);
    }

    public function uploadProductImage(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:min_width=300,min_height=300,max_width=6000,max_height=6000', 'max:5120'],
        ]);
        $path = $validated['image']->store("seller-products/{$product->id}");
        if (! $path) {
            abort(500, 'The product image could not be saved.');
        }
        $media = $product->product_media ?? [];
        if (count($media) >= 10) {
            Storage::disk('local')->delete($path);
            abort(422, 'A product can have up to 10 photos.');
        }
        $media[] = $path;
        $product->update(['product_media' => $media, 'image_path' => $media[0]]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function uploadProductMedia(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:min_width=300,min_height=300,max_width=6000,max_height=6000', 'max:5120'],
        ]);
        $media = $product->product_media ?? ($product->image_path ? [$product->image_path] : []);
        abort_if(count($media) + count($validated['images']) > 10, 422, 'A product can have up to 10 photos.');
        $paths = [];
        foreach ($validated['images'] as $image) {
            $path = $image->store("seller-products/{$product->id}");
            if (! $path) {
                Storage::disk('local')->delete($paths);
                abort(500, 'One or more product photos could not be saved.');
            }
            $paths[] = $path;
        }
        $media = [...$media, ...$paths];
        $product->update(['product_media' => $media, 'image_path' => $media[0] ?? null]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function deleteProductMedia(Request $request, SellerProduct $product, int $index): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $media = $product->product_media ?? ($product->image_path ? [$product->image_path] : []);
        abort_unless(array_key_exists($index, $media), 404, 'Photo not found.');
        Storage::disk('local')->delete($media[$index]);
        array_splice($media, $index, 1);
        $combinations = $product->variation_combinations ?? [];
        foreach ($combinations as &$combination) {
            $imageIndex = $combination['imageIndex'] ?? null;
            if ($imageIndex !== null && (int) $imageIndex === $index) {
                $combination['imageIndex'] = null;
            } elseif ($imageIndex !== null && $imageIndex > $index) {
                $combination['imageIndex'] = $imageIndex - 1;
            }
        }
        unset($combination);
        $details = $product->product_details ?? [];
        if (isset($details['videoCoverIndex'])) {
            if ((int) $details['videoCoverIndex'] === $index) {
                $details['videoCoverIndex'] = null;
            } elseif ($details['videoCoverIndex'] > $index) {
                $details['videoCoverIndex']--;
            }
        }
        $product->update([
            'product_media' => array_values($media),
            'image_path' => $media[0] ?? null,
            'variation_combinations' => $combinations,
            'product_details' => $details,
        ]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function reorderProductMedia(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'order' => ['required', 'array', 'min:1', 'max:10'],
            'order.*' => ['required', 'integer', 'min:0', 'max:9', 'distinct'],
        ]);
        $media = $product->product_media ?? ($product->image_path ? [$product->image_path] : []);
        abort_unless(count($validated['order']) === count($media), 422, 'The reordered photos do not match this product gallery.');
        foreach ($validated['order'] as $index) {
            abort_unless(array_key_exists($index, $media), 422, 'The reordered photos do not match this product gallery.');
        }
        $media = array_map(fn (int $index) => $media[$index], $validated['order']);
        $newIndexes = array_flip($validated['order']);
        $combinations = $product->variation_combinations ?? [];
        foreach ($combinations as &$combination) {
            $imageIndex = $combination['imageIndex'] ?? null;
            if ($imageIndex !== null) {
                $combination['imageIndex'] = $newIndexes[$imageIndex] ?? null;
            }
        }
        unset($combination);
        $details = $product->product_details ?? [];
        if (isset($details['videoCoverIndex'])) {
            $details['videoCoverIndex'] = $newIndexes[$details['videoCoverIndex']] ?? null;
        }
        $product->update([
            'product_media' => $media,
            'image_path' => $media[0] ?? null,
            'variation_combinations' => $combinations,
            'product_details' => $details,
        ]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function uploadProductVideo(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'video' => ['required', 'file', 'mimes:mp4,mov,webm', 'max:51200'],
        ]);
        $path = $validated['video']->store("seller-products/{$product->id}/video");
        if (! $path) {
            abort(500, 'The product video could not be saved.');
        }
        if ($product->video_path) {
            Storage::disk('local')->delete($product->video_path);
        }
        $product->update(['video_path' => $path]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function deleteProductVideo(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        if ($product->video_path) {
            Storage::disk('local')->delete($product->video_path);
            $product->update(['video_path' => null]);
        }

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function uploadProducerMedia(Request $request, SellerProduct $product): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:min_width=300,min_height=300,max_width=6000,max_height=6000', 'max:5120'],
        ]);
        $media = $product->producer_media ?? [];
        abort_if(count($media) + count($validated['images']) > 10, 422, 'A product can have up to 10 producer gallery photos.');
        $paths = [];
        foreach ($validated['images'] as $image) {
            $path = $image->store("seller-products/{$product->id}/producer");
            if (! $path) {
                Storage::disk('local')->delete($paths);
                abort(500, 'One or more producer photos could not be saved.');
            }
            $paths[] = $path;
        }
        $product->update(['producer_media' => [...$media, ...$paths]]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function deleteProducerMedia(Request $request, SellerProduct $product, int $index): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($product->seller_application_id === $application->id, 404);
        $media = $product->producer_media ?? [];
        abort_unless(array_key_exists($index, $media), 404, 'Producer photo not found.');
        Storage::disk('local')->delete($media[$index]);
        array_splice($media, $index, 1);
        $product->update(['producer_media' => array_values($media)]);

        return response()->json(['data' => $this->productData($product->fresh())]);
    }

    public function productImage(SellerProduct $product)
    {
        $path = ($product->product_media[0] ?? null) ?: $product->image_path;
        abort_unless($path && $product->is_active && ! $product->admin_suspended
            && $product->sellerApplication()->where('status', 'approved')->whereHas('user', fn ($query) => $query->where('is_suspended', false))->exists(), 404);

        return Storage::disk('local')->response($path);
    }

    public function productMedia(SellerProduct $product, int $index)
    {
        $paths = $product->product_media ?? ($product->image_path ? [$product->image_path] : []);
        abort_unless(
            $product->is_active
                && ! $product->admin_suspended
                && $product->sellerApplication()->where('status', 'approved')->whereHas('user', fn ($query) => $query->where('is_suspended', false))->exists()
                && isset($paths[$index]),
            404
        );

        return Storage::disk('local')->response($paths[$index]);
    }

    public function productVideo(SellerProduct $product)
    {
        abort_unless(
            $product->video_path
                && $product->is_active
                && ! $product->admin_suspended
                && $product->sellerApplication()->where('status', 'approved')->whereHas('user', fn ($query) => $query->where('is_suspended', false))->exists(),
            404
        );

        return Storage::disk('local')->response($product->video_path);
    }

    public function producerMedia(SellerProduct $product, int $index)
    {
        $paths = $product->producer_media ?? [];
        abort_unless(
            $product->is_active
                && ! $product->admin_suspended
                && $product->sellerApplication()->where('status', 'approved')->whereHas('user', fn ($query) => $query->where('is_suspended', false))->exists()
                && isset($paths[$index]),
            404
        );

        return Storage::disk('local')->response($paths[$index]);
    }

    public function discounts(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);

        return response()->json(['data' => $application->discounts()->latest()->get()]);
    }

    public function storeDiscount(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('seller_discounts', 'code')],
            'type' => ['sometimes', 'string', Rule::in(['percentage', 'fixed_amount', 'minimum_spend'])],
            'percentage' => ['required_without:type', 'required_if:type,percentage', 'nullable', 'numeric', 'gt:0', 'max:90'],
            'amount' => ['required_if:type,fixed_amount,minimum_spend', 'nullable', 'numeric', 'gt:0', 'max:99999999.99'],
            'minimumSpend' => ['required_if:type,minimum_spend', 'nullable', 'numeric', 'gt:0', 'max:99999999.99'],
            'maxUses' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'startsAt' => ['nullable', 'date'],
            'endsAt' => ['nullable', 'date', 'after:startsAt'],
            'isActive' => ['sometimes', 'boolean'],
        ]);
        $type = $validated['type'] ?? 'percentage';
        $discount = $application->discounts()->create([
            'name' => trim($validated['name']),
            'code' => strtoupper($validated['code']),
            'type' => $type,
            'percentage' => $type === 'percentage' ? $validated['percentage'] : 0,
            'amount' => $type === 'percentage' ? null : $validated['amount'],
            'minimum_spend' => $type === 'minimum_spend' ? $validated['minimumSpend'] : null,
            'max_uses' => $validated['maxUses'] ?? null,
            'starts_at' => $validated['startsAt'] ?? null,
            'ends_at' => $validated['endsAt'] ?? null,
            'is_active' => $request->boolean('isActive', true),
        ]);

        return response()->json(['data' => $discount], 201);
    }

    public function deleteDiscount(Request $request, SellerDiscount $discount): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($discount->seller_application_id === $application->id, 404);
        $discount->delete();

        return response()->json(['message' => 'Discount deleted.']);
    }

    public function reviews(Request $request): JsonResponse
    {
        $application = $this->approvedApplication($request);
        $reviews = ProductReview::query()
            ->where('seller_application_id', $application->id)
            ->with(['buyer:id,name', 'product:id,name'])
            ->latest()
            ->get()
            ->map(fn (ProductReview $review) => [
                'id' => $review->id,
                'product' => $review->product->name,
                'buyer' => $review->buyer->name,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'sellerResponse' => $review->seller_response,
                'createdAt' => $review->created_at,
            ]);

        return response()->json(['data' => $reviews]);
    }

    public function respondToReview(Request $request, ProductReview $review): JsonResponse
    {
        $application = $this->approvedApplication($request);
        abort_unless($review->seller_application_id === $application->id, 404);
        $validated = $request->validate([
            'response' => ['required', 'string', 'max:2000'],
        ]);
        $review->update(['seller_response' => $validated['response']]);

        return response()->json(['message' => 'Response saved.']);
    }

    public function downloadSalesReport(Request $request)
    {
        $application = $this->approvedApplication($request);
        $orders = $application->orders()->with('buyer:id,name')->latest()->get();
        $filename = 'seller-sales-'.$application->id.'-'.now()->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($orders): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Order', 'Date', 'Customer', 'Status', 'Subtotal', 'Discount', 'Shipping', 'Total']);
            foreach ($orders as $order) {
                fputcsv($stream, [
                    $order->order_number,
                    $order->created_at->toISOString(),
                    $order->buyer->name,
                    $order->status,
                    $order->subtotal,
                    $order->discount_amount,
                    $order->shipping_fee,
                    $order->subtotal - $order->discount_amount + $order->shipping_fee,
                ]);
            }
            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function publicProducts(): JsonResponse
    {
        $products = SellerProduct::query()
            ->where('is_active', true)
            ->where('admin_suspended', false)
            ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
            ->whereHas('sellerApplication.user', fn ($query) => $query->where('is_suspended', false))
            ->with('sellerApplication:id,shop_name,application_data')
            ->latest()
            ->get()
            ->map(function (SellerProduct $product) {
                return [
                    ...$this->productData($product),
                    'id' => "seller-{$product->id}",
                    'sellerId' => $product->seller_application_id,
                    'seller' => $product->sellerApplication->shop_name,
                    'location' => 'Sta. Maria, Bulacan',
                    'shippingFee' => (float) ($product->sellerApplication->application_data['shippingFee'] ?? 60),
                    'storefront' => collect($product->sellerApplication->application_data)
                        ->only(['description', 'logoUrl', 'bannerUrl', 'shippingPolicy', 'returnPolicy', 'shopPhone', 'shopEmail'])
                        ->all(),
                ];
            });

        return response()->json(['data' => $products]);
    }

    public function publicProductReviews(string $product): JsonResponse
    {
        abort_unless(preg_match('/^seller-([1-9][0-9]*)$/', $product, $matches) === 1, 404);

        $sellerProduct = SellerProduct::query()
            ->whereKey((int) $matches[1])
            ->where('is_active', true)
            ->where('admin_suspended', false)
            ->whereHas('sellerApplication', fn ($query) => $query->where('status', 'approved'))
            ->whereHas('sellerApplication.user', fn ($query) => $query->where('is_suspended', false))
            ->firstOrFail();

        $reviews = ProductReview::query()
            ->where('seller_product_id', $sellerProduct->id)
            ->latest()
            ->get()
            ->map(fn (ProductReview $review) => [
                'id' => $review->id,
                'buyer' => 'Verified buyer',
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'sellerResponse' => $review->seller_response,
                'createdAt' => $review->created_at,
            ]);

        return response()->json(['data' => $reviews]);
    }

    public function adminApplications(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $applications = SellerApplication::query()
            ->with('user:id,name,email,phone')
            ->where('status', 'pending')
            ->oldest()
            ->get();

        return response()->json([
            'data' => $applications->map(fn (SellerApplication $application) => [
                ...$this->applicationData($application),
                'applicant' => $application->user,
            ]),
        ]);
    }

    public function reviewApplication(Request $request, SellerApplication $application): JsonResponse
    {
        $this->ensureAdmin($request);
        abort_unless($application->status === 'pending', 409, 'Only pending applications can be reviewed.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'reviewerNote' => ['nullable', 'string', 'max:2000'],
        ]);

        $application->update([
            'status' => $validated['status'],
            'reviewer_note' => $validated['reviewerNote'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'data' => $this->applicationData($application->fresh()),
        ]);
    }

    public function downloadDocument(Request $request, SellerApplication $application, string $document): StreamedResponse
    {
        $this->ensureAdmin($request);
        abort_unless(in_array($document, self::DOCUMENT_FIELDS, true), 404);
        $path = $application->documents[$document] ?? null;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }

    private function approvedApplication(Request $request): SellerApplication
    {
        $application = $request->user()->sellerApplication()->first();
        abort_unless($application && $application->status === 'approved', 403, 'An approved seller account is required.');

        return $application;
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()->is_admin, 403, 'Administrator access is required.');
    }

    private function validateProduct(Request $request, SellerApplication $application, ?SellerProduct $product = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'category' => ['required', 'string', 'max:120'],
            'subcategory' => ['nullable', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'gt:0', 'max:99999999'],
            'unit' => ['required', 'string', 'max:80'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'imageUrl' => ['nullable', 'url', 'max:2048'],
            'sku' => [
                'nullable',
                'string',
                'max:120',
                Rule::unique('seller_products', 'sku')
                    ->where(fn ($query) => $query->where('seller_application_id', $application->id))
                    ->ignore($product?->id),
            ],
            'variations' => ['nullable', 'array', 'max:20'],
            'variations.*.name' => ['required', 'string', 'max:60'],
            'variations.*.options' => ['required', 'array', 'min:1', 'max:30'],
            'variations.*.options.*' => ['required', 'string', 'max:80'],
            'variationCombinations' => ['nullable', 'array', 'max:250'],
            'variationCombinations.*.options' => ['required', 'array', 'max:20'],
            'variationCombinations.*.options.*.name' => ['required', 'string', 'max:60'],
            'variationCombinations.*.options.*.value' => ['required', 'string', 'max:80'],
            'variationCombinations.*.price' => ['required', 'numeric', 'gt:0', 'max:99999999'],
            'variationCombinations.*.stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'variationCombinations.*.sku' => ['nullable', 'string', 'max:120'],
            'variationCombinations.*.imageIndex' => ['nullable', 'integer', 'min:0', 'max:9'],
            'details' => ['nullable', 'array'],
            'details.productType' => ['nullable', 'string', 'max:80'],
            'details.brand' => ['nullable', 'string', 'max:120'],
            'details.originBarangay' => ['nullable', 'string', 'max:120'],
            'details.barcode' => ['nullable', 'string', 'max:120'],
            'details.weight' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'details.weightUnit' => ['nullable', Rule::in(['g', 'kg', 'ml', 'L'])],
            'details.dimensions.length' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'details.dimensions.width' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'details.dimensions.height' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'details.packagingType' => ['nullable', 'string', 'max:80'],
            'details.minimumOrder' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'details.maximumOrder' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'details.expirationDate' => ['nullable', 'date'],
            'details.shelfLife' => ['nullable', 'string', 'max:120'],
            'details.shippingNotes' => ['nullable', 'string', 'max:1000'],
            'details.producerName' => ['nullable', 'string', 'max:180'],
            'details.productSource' => ['nullable', Rule::in(['Farmer', 'Cooperative', 'Home-based producer', 'Manufacturer', 'Artisan', 'Other'])],
            'details.locallyProduced' => ['nullable', 'boolean'],
            'details.productionMethod' => ['nullable', 'string', 'max:1000'],
            'details.productStory' => ['nullable', 'string', 'max:3000'],
            'details.videoCoverIndex' => ['nullable', 'integer', 'min:0', 'max:9'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $variations = $validated['variations'] ?? [];
        $combinations = $validated['variationCombinations'] ?? [];
        $variationNames = collect($variations)
            ->map(fn (array $variation) => mb_strtolower(trim($variation['name'])))
            ->values();
        abort_if($variationNames->unique()->count() !== $variationNames->count(), 422, 'Variation group names must be unique.');
        foreach ($variations as $variation) {
            $options = collect($variation['options'])
                ->map(fn (string $option) => mb_strtolower(trim($option)))
                ->values();
            abort_if($options->unique()->count() !== $options->count(), 422, 'Options within a variation group must be unique.');
        }
        if ($variations && ! $combinations) {
            abort(422, 'Set a price and stock for every variation combination.');
        }
        if (! $variations && $combinations) {
            abort(422, 'Variation combinations require at least one variation group.');
        }
        if ($variations) {
            $expected = [[]];
            foreach ($variations as $variation) {
                $expected = collect($expected)->flatMap(fn (array $prefix) => collect($variation['options'])
                    ->map(fn (string $option) => [...$prefix, ['name' => $variation['name'], 'value' => $option]]))
                    ->all();
            }
            abort_if(count($expected) > 250, 422, 'A product can have up to 250 variation combinations.');
            $expectedKeys = collect($expected)->map(fn (array $options) => $this->variationKey($options))->sort()->values();
            $combinationKeys = collect($combinations)->map(fn (array $combination) => $this->variationKey($combination['options']))->sort()->values();
            abort_unless(
                $expectedKeys->all() === $combinationKeys->all(),
                422,
                'Add exactly one price and stock entry for every variation combination.'
            );
            $stock = array_sum(array_column($combinations, 'stock'));
        } else {
            $stock = (int) $validated['stock'];
        }
        $maximumOrder = $validated['details']['maximumOrder'] ?? null;
        $minimumOrder = $validated['details']['minimumOrder'] ?? 1;
        abort_if($maximumOrder !== null && $maximumOrder < $minimumOrder, 422, 'Maximum order must be at least the minimum order.');

        $submittedSkus = collect([
            $validated['sku'] ?? null,
            ...collect($combinations)->pluck('sku')->all(),
        ])->filter(fn ($sku) => is_string($sku) && trim($sku) !== '')
            ->map(fn (string $sku) => mb_strtolower(trim($sku)))
            ->values();
        abort_if($submittedSkus->unique()->count() !== $submittedSkus->count(), 422, 'Product and variation SKUs must be unique.');
        $existingSkus = $application->products()
            ->when($product, fn ($query) => $query->where('id', '<>', $product->id))
            ->get(['id', 'sku', 'variation_combinations'])
            ->flatMap(fn (SellerProduct $existingProduct) => [
                $existingProduct->sku,
                ...collect($existingProduct->variation_combinations ?? [])->pluck('sku')->all(),
            ])
            ->filter(fn ($sku) => is_string($sku) && trim($sku) !== '')
            ->map(fn (string $sku) => mb_strtolower(trim($sku)));
        abort_if($submittedSkus->intersect($existingSkus)->isNotEmpty(), 422, 'A product or variation SKU is already in use by this shop.');

        return [
            ...collect($validated)->except(['imageUrl', 'isActive', 'variationCombinations', 'details', 'subcategory', 'sku'])->all(),
            'image_url' => $request->input('imageUrl'),
            'variations' => $variations,
            'variation_combinations' => $combinations,
            'subcategory' => $validated['subcategory'] ?? null,
            'sku' => $validated['sku'] ?? null,
            'product_details' => $validated['details'] ?? [],
            'stock' => $stock,
            'is_active' => $request->boolean('isActive', true),
        ];
    }

    private function variationKey(array $options): string
    {
        return json_encode(collect($options)->sortBy('name')->values()->all(), JSON_THROW_ON_ERROR);
    }

    private function applicationData(SellerApplication $application): array
    {
        return [
            'id' => $application->id,
            'shopName' => $application->shop_name,
            'category' => $application->category,
            'status' => $application->status,
            'details' => $application->application_data,
            'documents' => collect($application->documents ?? [])
                ->map(fn () => true)
                ->all(),
            'reviewerNote' => $application->reviewer_note,
            'reviewedAt' => $application->reviewed_at,
        ];
    }

    private function productData(SellerProduct $product): array
    {
        $reviews = ProductReview::query()->where('seller_product_id', $product->id);
        $media = $product->product_media ?? ($product->image_path ? [$product->image_path] : []);
        $details = $product->product_details ?? [];
        $videoUrl = $product->video_path ? url("/api/marketplace/products/{$product->id}/video") : null;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'subcategory' => $product->subcategory,
            'description' => $product->description,
            'price' => $product->price,
            'unit' => $product->unit,
            'stock' => $product->stock,
            'sku' => $product->sku,
            'details' => $details,
            'imageUrl' => $media
                ? url("/api/marketplace/products/{$product->id}/media/0")
                : ($product->image_url ?: '/images/handwoven-basket.svg'),
            'images' => $media
                ? collect($media)->keys()->map(fn (int $index) => url("/api/marketplace/products/{$product->id}/media/{$index}"))->all()
                : [$product->image_url ?: '/images/handwoven-basket.svg'],
            'mediaCount' => count($media),
            'producerImages' => collect($product->producer_media ?? [])
                ->keys()
                ->map(fn (int $index) => url("/api/marketplace/products/{$product->id}/producer-media/{$index}"))
                ->all(),
            'videoUrl' => $videoUrl,
            'variations' => $product->variations ?? [],
            'variationCombinations' => $product->variation_combinations ?? [],
            'tag' => 'Local seller',
            'rating' => (float) ($reviews->avg('rating') ?? 0),
            'reviews' => $reviews->count(),
            'sold' => 0,
            'location' => 'Sta. Maria, Bulacan',
            'isActive' => $product->is_active,
            'adminSuspended' => $product->admin_suspended,
        ];
    }
}
