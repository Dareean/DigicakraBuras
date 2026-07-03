<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // === PUBLIC CUSTOMER ENDPOINTS ===
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/track', [OrderController::class, 'track']);
    Route::get('/orders/{order_code}', [OrderController::class, 'show']);
    
    Route::post('/payments/{order_id}/generate-qr', [PaymentController::class, 'generateQR']);
    Route::post('/payments/webhook', [PaymentController::class, 'webhook']);
    
    // Simulating e-nota PDF download URL
    Route::get('/orders/{order_code}/note', function ($order_code) {
        $order = \App\Models\Order::where('order_code', $order_code)->with('customer', 'items.product', 'payments')->firstOrFail();
        return response()->json([
            'status' => 'success',
            'nota_title' => "E-Nota DIGICAKRA #{$order->order_code}",
            'date' => $order->created_at->toDateTimeString(),
            'customer' => [
                'name' => $order->customer->name ?? 'Guest',
                'phone' => $order->customer->phone_number,
            ],
            'items' => $order->items->map(function($i) {
                return [
                    'name' => $i->item_type === 'atk' ? $i->product->name : ucfirst($i->item_type),
                    'qty' => $i->qty,
                    'price' => $i->unit_price,
                    'subtotal' => $i->subtotal,
                    'specs' => $i->spec_json
                ];
            }),
            'total' => $order->total_amount,
            'payment_status' => $order->payments->first()->status ?? 'pending'
        ]);
    });

    // === ADMIN AUTHENTICATION ===
    Route::post('/admin/login', [AdminAuthController::class, 'login']);

    // === SECURED ADMIN ENDPOINTS ===
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
        Route::get('/admin/me', [AdminAuthController::class, 'me']);
        
        // Orders
        Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
        Route::patch('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);
        
        // Inventory
        Route::get('/admin/inventory', [InventoryController::class, 'index']);
        Route::patch('/admin/inventory/{id}', [InventoryController::class, 'update']);
        Route::get('/admin/inventory/logs', [InventoryController::class, 'logs']);
        
        // Products CRUD (ATK Catalog)
        Route::get('/admin/products', [ProductController::class, 'adminIndex']);
        Route::post('/admin/products', [ProductController::class, 'store']);
        Route::put('/admin/products/{id}', [ProductController::class, 'update']);
        Route::delete('/admin/products/{id}', [ProductController::class, 'destroy']);
        
        // Customers & Loyalty
        Route::get('/admin/customers', [ReportController::class, 'customersIndex']);
        
        // Dashboard Metrics & Reporting
        Route::get('/admin/dashboard/summary', [ReportController::class, 'dashboardSummary']);
        Route::get('/admin/reports/revenue', [ReportController::class, 'revenueReport']);
        Route::get('/admin/reports/tax/export', [ReportController::class, 'exportTaxReport']);
    });
});

