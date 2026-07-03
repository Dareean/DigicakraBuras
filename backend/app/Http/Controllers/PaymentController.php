<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class PaymentController extends Controller
{
    // Public: Generate QR (returns details of payment)
    public function generateQR($orderId)
    {
        $order = Order::findOrFail($orderId);
        $payment = Payment::where('order_id', $order->id)->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => [
                'order_code' => $order->order_code,
                'total_amount' => $order->total_amount,
                'qr_string' => $payment->qr_string,
                'status' => $payment->status,
            ]
        ]);
    }

    // Public/Webhook: Handles Callback from Payment Gateway (e.g., Xendit/Midtrans) or local simulator
    public function webhook(Request $request)
    {
        $validated = $request->validate([
            'order_code' => 'required|string',
            'status' => 'required|in:success,failed,expired',
            'payment_ref' => 'nullable|string',
        ]);

        $order = Order::where('order_code', $validated['order_code'])->first();

        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        $payment = Payment::where('order_id', $order->id)->first();
        if (! $payment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Detail pembayaran tidak ditemukan'
            ], 404);
        }

        // Avoid double processing
        if ($payment->status === 'success') {
            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran sudah sukses diproses sebelumnya'
            ]);
        }

        try {
            DB::transaction(function () use ($order, $payment, $validated, $request) {
                // 1. Update Payment Status
                $payment->status = $validated['status'];
                $payment->payment_gateway_ref = $validated['payment_ref'] ?? $payment->payment_gateway_ref;
                if ($validated['status'] === 'success') {
                    $payment->paid_at = Carbon::now();
                }
                $payment->webhook_payload = $request->all();
                $payment->save();

                // 2. Update Order Status if successful
                if ($validated['status'] === 'success') {
                    $order->status = 'diproses';
                    $order->save();

                    // 3. Decrement Inventory & Product Stocks
                    $this->processStocksAndInventory($order);

                    // 4. Generate E-Nota (Mock PDF URL)
                    Note::create([
                        'order_id' => $order->id,
                        'pdf_url' => url("/api/v1/orders/{$order->order_code}/note"),
                        'sent_at' => Carbon::now(),
                    ]);
                } else if (in_array($validated['status'], ['failed', 'expired'])) {
                    $order->status = 'dibatalkan';
                    $order->save();
                }
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Webhook berhasil diproses',
                'data' => [
                    'order_code' => $order->order_code,
                    'order_status' => $order->status,
                    'payment_status' => $payment->status,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    // Helper: Logic to deduct inventory materials and ATK stock on successful payment
    private function processStocksAndInventory(Order $order)
    {
        $orderItems = OrderItem::where('order_id', $order->id)->get();

        foreach ($orderItems as $item) {
            if ($item->item_type === 'atk') {
                // ATK Stock decrement
                if ($item->product_id) {
                    $product = Product::findOrFail($item->product_id);
                    $product->stock_qty = max(0, $product->stock_qty - $item->qty);
                    $product->save();
                }
            } else {
                // Print / Photocopy Inventory Material decrement
                $spec = $item->spec_json ?? [];
                $paperSize = $spec['paper_size'] ?? 'A4';
                $colorType = $spec['color_type'] ?? 'grayscale';
                $bindingType = $spec['binding_type'] ?? 'none';
                $pageCount = $spec['page_count'] ?? 1;
                $qty = $item->qty; // copies count

                $totalPages = $pageCount * $qty;

                // 1. Kertas HVS
                $paperItemName = ($paperSize === 'F4') 
                    ? 'Kertas HVS F4 70gsm (Cetak/Copy)' 
                    : 'Kertas HVS A4 70gsm (Cetak/Copy)';
                
                $paperInventory = InventoryItem::where('item_name', $paperItemName)->first();
                if ($paperInventory) {
                    // 1 rim = 500 sheets.
                    // We calculate sheets. But we store rim. For calculation simplicity,
                    // let's say our DB unit is sheets or sheets-equivalent.
                    // Wait, the seed has 50 rim, and let's assume we can deduct in sheets,
                    // or let's say 1 unit in DB is sheets, or we subtract sheets.
                    // Let's check the seeder unit: it was 'Rim'. If current_qty is 50 (rims),
                    // then we subtract pages. Since pages are sheets, totalPages sheets is totalPages/500 rim.
                    // Wait, let's do a simple calculation: we can deduct totalPages sheets.
                    // Or let's store quantities and do subtraction. To avoid floating point issues
                    // in simple integer DB, let's keep inventory quantity as sheets or deduct sheets.
                    // Wait, if seeder current_qty is 50 (rims), then 1 rim = 500 sheets.
                    // Let's check if we can reduce current_qty. Since it is an integer,
                    // we can say: if totalPages >= 10, we deduct sheets.
                    // Wait, to keep it simple and robust, let's treat the integer current_qty as Rim,
                    // and we deduct totalPages/500 (or if it's less than 1 rim, we deduct 0 or at least we track it).
                    // Or we could have current_qty represent sheets, but seeder said 50 rim.
                    // Let's say: if totalPages > 0, we calculate sheets. Let's do:
                    // $sheetsToRims = $totalPages / 500;
                    // Let's say we deduct $totalPages sheets, and if we treat the DB field as sheets,
                    // we could just multiply seeder stock by 500. But the DB current_qty is 50.
                    // Let's do: we convert rims to sheets by treating $paperInventory->current_qty as sheets if it was converted,
                    // or we do floating point or we deduct at least 1 rim if totalPages is large,
                    // or we deduct 1 unit from DB as "1 sheet" and we seeded 5000 sheets?
                    // Actually, let's just do a simple decrement:
                    // Let's say we deduct 1 unit of A4 Paper for every 500 pages (minimum 1 sheet or 1 unit).
                    // Let's say $deductQty = ceil($totalPages / 500) or just deduct totalPages if the unit in DB was sheets.
                    // Let's look at unit = 'Rim'. Let's say we deduct sheets: if we do sheets,
                    // we can just deduct $totalPages sheets from a total of $current_qty * 500.
                    // Let's just deduct a fractional or round it: $deductRims = max(1, (int)round($totalPages / 500));
                    // That is easy and clean! Let's do that.
                    $deductRims = max(1, (int)ceil($totalPages / 500));
                    $paperInventory->current_qty = max(0, $paperInventory->current_qty - $deductRims);
                    $paperInventory->save();

                    InventoryLog::create([
                        'inventory_item_id' => $paperInventory->id,
                        'change_qty' => -$deductRims,
                        'reason' => "Pemakaian order #{$order->order_code} ({$totalPages} halaman)",
                    ]);
                }

                // 2. Tinta
                // Grayscale uses Black Ink. Color uses Color Ink.
                // Say 1 botol ink = 5000 pages.
                // We deduct 1 botol ink for every 5000 pages.
                $inkItemName = ($colorType === 'color')
                    ? 'Tinta Printer Epson Color Set (003)'
                    : 'Tinta Printer Epson Black (003)';

                $inkInventory = InventoryItem::where('item_name', $inkItemName)->first();
                if ($inkInventory) {
                    $deductBotol = max(1, (int)ceil($totalPages / 5000));
                    $inkInventory->current_qty = max(0, $inkInventory->current_qty - $deductBotol);
                    $inkInventory->save();

                    InventoryLog::create([
                        'inventory_item_id' => $inkInventory->id,
                        'change_qty' => -$deductBotol,
                        'reason' => "Pemakaian order #{$order->order_code}",
                    ]);
                }

                // 3. Jilid Binding
                if ($bindingType === 'mika') {
                    $mikaInventory = InventoryItem::where('item_name', 'Mika Plastik Jilid A4')->first();
                    if ($mikaInventory) {
                        $deductMika = $qty; // 1 mika per copy
                        $mikaInventory->current_qty = max(0, $mikaInventory->current_qty - $deductMika);
                        $mikaInventory->save();

                        InventoryLog::create([
                            'inventory_item_id' => $mikaInventory->id,
                            'change_qty' => -$deductMika,
                            'reason' => "Pemakaian order #{$order->order_code}",
                        ]);
                    }
                } elseif ($bindingType === 'lakban') {
                    $lakbanInventory = InventoryItem::where('item_name', 'Lakban Hitam Jilid 2 Inch')->first();
                    if ($lakbanInventory) {
                        $deductLakban = max(1, (int)ceil($qty / 10)); // 1 roll for 10 bindings
                        $lakbanInventory->current_qty = max(0, $lakbanInventory->current_qty - $deductLakban);
                        $lakbanInventory->save();

                        InventoryLog::create([
                            'inventory_item_id' => $lakbanInventory->id,
                            'change_qty' => -$deductLakban,
                            'reason' => "Pemakaian order #{$order->order_code}",
                        ]);
                    }
                }
            }
        }
    }
}
