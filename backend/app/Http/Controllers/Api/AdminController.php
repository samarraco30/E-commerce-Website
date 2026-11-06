<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PlatformSetting;
use App\Models\ReturnRequest;
use App\Models\SellerApplication;
use App\Models\SellerProduct;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $orders = Order::query();
        $monthlyOrders = collect(range(5, 0))->map(function (int $monthsAgo): array {
            $month = now()->startOfMonth()->subMonths($monthsAgo);
            $orders = Order::query()
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->whereNotIn('status', ['Cancelled', 'Refunded']);

            return [
                'month' => $month->format('M Y'),
                'orders' => (clone $orders)->count(),
                'revenue' => (float) $orders->sum(DB::raw('subtotal + shipping_fee - discount_amount')),
            ];
        });

        return response()->json(['data' => [
            'metrics' => [
                'users' => User::query()->where('is_admin', false)->count(),
                'verifiedUsers' => User::query()->where('is_admin', false)->where('is_verified', true)->count(),
                'suspendedUsers' => User::query()->where('is_admin', false)->where('is_suspended', true)->count(),
                'sellerApplications' => SellerApplication::query()->count(),
                'pendingSellerApplications' => SellerApplication::query()->where('status', 'pending')->count(),
                'products' => SellerProduct::query()->count(),
                'activeProducts' => SellerProduct::query()
                    ->where('is_active', true)
                    ->where('admin_suspended', false)
                    ->whereHas('sellerApplication', fn ($query) => $query
                        ->where('status', 'approved')
                        ->whereHas('user', fn ($userQuery) => $userQuery->where('is_suspended', false)))
                    ->count(),
                'suspendedProducts' => SellerProduct::query()->where('admin_suspended', true)->count(),
                'orders' => (clone $orders)->count(),
                'pendingOrders' => (clone $orders)->whereIn('status', ['Order placed', 'Preparing', 'Ready to ship'])->count(),
                'completedOrders' => (clone $orders)->where('status', 'Delivered')->count(),
                'cancelledOrders' => (clone $orders)->where('status', 'Cancelled')->count(),
                'revenue' => (float) (clone $orders)->whereNotIn('status', ['Cancelled', 'Returned', 'Refunded'])
                    ->sum(DB::raw('subtotal + shipping_fee - discount_amount')),
                'pendingReturns' => ReturnRequest::query()->whereIn('status', ['pending', 'under_review'])->count(),
                'reviews' => DB::table('product_reviews')->count(),
            ],
            'monthlyOrders' => $monthlyOrders,
            'settings' => PlatformSetting::values(),
        ]]);
    }

    public function accounts(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $query = User::query()
            ->where('is_admin', false)
            ->with('sellerApplication:id,user_id,shop_name,status')
            ->withCount('orders');
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($builder) => $builder
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%"));
        }
        if ($request->query('status') === 'suspended') {
            $query->where('is_suspended', true);
        } elseif ($request->query('status') === 'unverified') {
            $query->where('is_verified', false);
        }

        return response()->json(['data' => $query->latest()->paginate(25)->through(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'createdAt' => $user->created_at,
            'verified' => $user->is_verified,
            'suspended' => $user->is_suspended,
            'suspensionReason' => $user->suspension_reason,
            'ordersCount' => $user->orders_count,
            'sellerApplication' => $user->sellerApplication ? [
                'shopName' => $user->sellerApplication->shop_name,
                'status' => $user->sellerApplication->status,
            ] : null,
        ])]);
    }

    public function updateAccount(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);
        abort_if($user->is_admin || $request->user()->is($user), 403, 'Administrator accounts cannot be changed here.');
        $validated = $request->validate([
            'verified' => ['required', 'boolean'],
            'suspended' => ['required', 'boolean'],
            'suspensionReason' => ['nullable', 'required_if:suspended,true', 'string', 'max:500'],
        ]);
        $user->update([
            'is_verified' => $validated['verified'],
            'is_suspended' => $validated['suspended'],
            'suspension_reason' => $validated['suspended'] ? trim($validated['suspensionReason']) : null,
        ]);
        if ($user->is_suspended) {
            $user->tokens()->delete();
        }

        return response()->json(['data' => [
            'id' => $user->id,
            'verified' => $user->is_verified,
            'suspended' => $user->is_suspended,
            'suspensionReason' => $user->suspension_reason,
        ]]);
    }

    public function products(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $query = SellerProduct::query()->with('sellerApplication:id,user_id,shop_name,status');
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($builder) => $builder
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('category', "%{$search}%")
                ->orWhereLike('sku', "%{$search}%"));
        }
        if ($request->query('status') === 'suspended') {
            $query->where('admin_suspended', true);
        } elseif ($request->query('status') === 'inactive') {
            $query->where('is_active', false);
        }

        return response()->json(['data' => $query->latest()->paginate(25)->through(fn (SellerProduct $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'sku' => $product->sku,
            'price' => $product->price,
            'stock' => $product->stock,
            'isActive' => $product->is_active,
            'adminSuspended' => $product->admin_suspended,
            'moderationReason' => $product->admin_moderation_reason,
            'imageUrl' => $product->product_media
                ? url("/api/marketplace/products/{$product->id}/media/0")
                : ($product->image_url ?: '/images/handwoven-basket.svg'),
            'shopName' => $product->sellerApplication->shop_name,
            'sellerStatus' => $product->sellerApplication->status,
        ])]);
    }

    public function moderateProduct(Request $request, SellerProduct $product): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'suspended' => ['required', 'boolean'],
            'reason' => ['nullable', 'required_if:suspended,true', 'string', 'max:500'],
        ]);
        $product->update([
            'admin_suspended' => $validated['suspended'],
            'admin_moderation_reason' => $validated['suspended'] ? trim($validated['reason']) : null,
        ]);

        return response()->json(['data' => [
            'id' => $product->id,
            'suspended' => $product->admin_suspended,
            'reason' => $product->admin_moderation_reason,
        ]]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $query = Order::query()->with([
            'buyer:id,name,email,is_suspended',
            'sellerApplication:id,shop_name,user_id',
            'returnRequest:id,order_id,status',
        ]);
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($builder) => $builder
                ->whereLike('order_number', "%{$search}%")
                ->orWhereHas('buyer', fn ($userQuery) => $userQuery
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%"))
                ->orWhereHas('sellerApplication', fn ($sellerQuery) => $sellerQuery
                    ->whereLike('shop_name', "%{$search}%")));
        }
        $orders = $query->latest()->paginate(30);
        $settings = PlatformSetting::values();
        $pageBuyerIds = $orders->getCollection()->pluck('buyer_id')->unique();
        $recentCounts = Order::query()
            ->whereIn('buyer_id', $pageBuyerIds)
            ->where('created_at', '>=', now()->subHour())
            ->select('buyer_id', DB::raw('COUNT(*) as order_count'))
            ->groupBy('buyer_id')
            ->pluck('order_count', 'buyer_id');

        return response()->json(['data' => $orders->through(function (Order $order) use ($settings, $recentCounts): array {
            $gross = max(0, $order->subtotal + $order->shipping_fee - $order->discount_amount);
            $reasons = [];
            if ($gross >= (float) $settings['suspicious_order_amount']) {
                $reasons[] = 'Order total exceeds the review threshold.';
            }
            if (($recentCounts[$order->buyer_id] ?? 0) >= 5) {
                $reasons[] = 'Buyer placed five or more orders in the last hour.';
            }

            return [
                'id' => $order->order_number,
                'placedAt' => $order->created_at,
                'buyer' => ['name' => $order->buyer->name, 'email' => $order->buyer->email, 'suspended' => $order->buyer->is_suspended],
                'shopName' => $order->sellerApplication->shop_name,
                'items' => $order->items,
                'subtotal' => $order->subtotal,
                'shippingFee' => $order->shipping_fee,
                'discountAmount' => $order->discount_amount,
                'total' => $gross,
                'status' => $order->status,
                'paymentMethod' => $order->payment_method,
                'trackingNumber' => $order->tracking_number,
                'returnStatus' => $order->returnRequest?->status,
                'suspicious' => $reasons !== [],
                'suspiciousReasons' => $reasons,
            ];
        })]);
    }

    public function returnRequests(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $query = ReturnRequest::query()->with([
            'buyer:id,name,email',
            'order:id,order_number,status,subtotal,shipping_fee,discount_amount,items,seller_application_id',
            'order.sellerApplication:id,shop_name',
            'reviewer:id,name',
        ]);
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json(['data' => $query->latest()->paginate(25)->through(fn (ReturnRequest $return): array => [
            'id' => $return->id,
            'reason' => $return->reason,
            'description' => $return->description,
            'status' => $return->status,
            'adminNote' => $return->admin_note,
            'createdAt' => $return->created_at,
            'reviewer' => $return->reviewer?->name,
            'buyer' => ['id' => $return->buyer->id, 'name' => $return->buyer->name, 'email' => $return->buyer->email],
            'order' => [
                'id' => $return->order->order_number,
                'status' => $return->order->status,
                'total' => $return->order->subtotal + $return->order->shipping_fee - $return->order->discount_amount,
                'items' => $return->order->items,
                'shopName' => $return->order->sellerApplication->shop_name,
            ],
        ])]);
    }

    public function updateReturnRequest(Request $request, ReturnRequest $returnRequest): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['under_review', 'approved', 'rejected', 'resolved'])],
            'adminNote' => ['nullable', 'string', 'max:2000'],
        ]);
        $allowedStatuses = match ($returnRequest->status) {
            'pending' => ['under_review', 'approved', 'rejected'],
            'under_review' => ['approved', 'rejected'],
            'approved' => ['resolved'],
            default => [],
        };
        abort_unless(in_array($validated['status'], $allowedStatuses, true), 409, 'This return request cannot move to that status.');
        $returnRequest->update([
            'status' => $validated['status'],
            'admin_note' => $validated['adminNote'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $returnRequest->id, 'status' => $returnRequest->status]]);
    }

    public function settings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return response()->json(['data' => PlatformSetting::values()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'default_shipping_fee' => ['required', 'numeric', 'min:0', 'max:99999'],
            'buyer_verification_required' => ['required', 'boolean'],
            'returns_enabled' => ['required', 'boolean'],
            'return_window_days' => ['required', 'integer', 'min:1', 'max:365'],
            'suspicious_order_amount' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'support_email' => ['nullable', 'email', 'max:255'],
        ]);
        $setting = PlatformSetting::query()->first();
        if ($setting) {
            $setting->update(['settings' => $validated]);
        } else {
            $setting = PlatformSetting::query()->create(['settings' => $validated]);
        }

        return response()->json(['data' => $setting->settings]);
    }

    public function transactionsReport(Request $request): StreamedResponse
    {
        $this->ensureAdmin($request);
        $filename = 'marketplace-transactions-'.now()->format('Y-m-d').'.csv';
        $orders = Order::query()->with(['buyer:id,name,email', 'sellerApplication:id,shop_name'])->orderBy('id');

        return response()->streamDownload(function () use ($orders): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Order', 'Date', 'Buyer', 'Buyer email', 'Shop', 'Status', 'Subtotal', 'Shipping', 'Discount', 'Total']);
            $orders->chunk(500, function ($batch) use ($stream): void {
                foreach ($batch as $order) {
                    fputcsv($stream, [
                        $order->order_number,
                        $order->created_at?->toISOString(),
                        $order->buyer->name,
                        $order->buyer->email,
                        $order->sellerApplication->shop_name,
                        $order->status,
                        $order->subtotal,
                        $order->shipping_fee,
                        $order->discount_amount,
                        $order->subtotal + $order->shipping_fee - $order->discount_amount,
                    ]);
                }
            });
            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()->is_admin, 403, 'Administrator access is required.');
    }
}
