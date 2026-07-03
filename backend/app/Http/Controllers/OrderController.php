<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\Stamp;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    // Public: Create a new order (Print or ATK or Mixed)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'phone_number' => 'required|string|max:20',
            'name' => 'nullable|string|max:100',
            'order_type' => 'required|in:print,atk,mixed',
            'pickup_note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:print_doc,fotokopi,pas_foto,undangan,atk',
            'items.*.product_id' => 'required_if:items.*.item_type,atk|nullable|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            // Specific specifications for print services
            'items.*.file_url' => 'nullable|string',
            'items.*.spec_json' => 'nullable|array',
            'items.*.spec_json.paper_size' => 'nullable|string|in:A4,F4',
            'items.*.spec_json.color_type' => 'nullable|string|in:grayscale,color',
            'items.*.spec_json.double_sided' => 'nullable|boolean',
            'items.*.spec_json.binding_type' => 'nullable|string|in:none,mika,lakban',
            'items.*.spec_json.page_count' => 'nullable|integer|min:1',
        ]);

        try {
            return DB::transaction(function () use ($validated, $request) {
                // 1. Find or create customer
                $customer = Customer::firstOrCreate(
                    ['phone_number' => $validated['phone_number']],
                    ['name' => $validated['name'] ?? 'Pelanggan Baru']
                );

                if ($validated['name'] && $customer->name !== $validated['name']) {
                    $customer->update(['name' => $validated['name']]);
                }

                // 2. Generate unique order code
                $orderCode = 'ORD-' . strtoupper(Str::random(8));
                while (Order::where('order_code', $orderCode)->exists()) {
                    $orderCode = 'ORD-' . strtoupper(Str::random(8));
                }

                // 3. Create the order
                $order = Order::create([
                    'order_code' => $orderCode,
                    'customer_id' => $customer->id,
                    'order_type' => $validated['order_type'],
                    'status' => 'menunggu_pembayaran',
                    'total_amount' => 0, // Will update below
                    'pickup_note' => $validated['pickup_note'] ?? null,
                ]);

                $totalAmount = 0;

                // 4. Create order items and calculate price
                foreach ($validated['items'] as $itemData) {
                    $unitPrice = 0;

                    if ($itemData['item_type'] === 'atk') {
                        $product = Product::findOrFail($itemData['product_id']);
                        
                        // Check stock
                        if ($product->stock_qty < $itemData['qty']) {
                            throw new \Exception("Stok untuk ATK '{$product->name}' tidak mencukupi. Tersedia: {$product->stock_qty}");
                        }
                        
                        $unitPrice = $product->price;
                    } else {
                        // Pricing logic for print services based on specs
                        $spec = $itemData['spec_json'] ?? [];
                        $pages = $spec['page_count'] ?? 1;
                        $color = $spec['color_type'] ?? 'grayscale';
                        $binding = $spec['binding_type'] ?? 'none';
                        $qty = $itemData['qty']; // number of copies

                        // Rates:
                        // Grayscale print: Rp 500 per page
                        // Color print: Rp 1.500 per page
                        // Binding: None = 0, Mika = Rp 5.000, Lakban = Rp 3.000
                        $perPageRate = ($color === 'color') ? 1500 : 500;
                        $printCost = $pages * $perPageRate;

                        $bindingCost = 0;
                        if ($binding === 'mika') {
                            $bindingCost = 5000;
                        } elseif ($binding === 'lakban') {
                            $bindingCost = 3000;
                        }

                        $unitPrice = $printCost + $bindingCost;
                    }

                    $subtotal = $unitPrice * $itemData['qty'];
                    $totalAmount += $subtotal;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'item_type' => $itemData['item_type'],
                        'product_id' => $itemData['product_id'] ?? null,
                        'file_url' => $itemData['file_url'] ?? null,
                        'spec_json' => $itemData['spec_json'] ?? null,
                        'qty' => $itemData['qty'],
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);
                }

                // Update total amount
                $order->update(['total_amount' => $totalAmount]);

                // 5. Initialize payment details
                // Midtrans/Xendit Sandbox Payload simulation
                $payment = Payment::create([
                    'order_id' => $order->id,
                    'payment_gateway_ref' => 'PAY-' . strtoupper(Str::random(10)),
                    'qr_string' => 'qris://cakrawala-copy-print/' . $order->order_code . '?amount=' . $totalAmount,
                    'amount' => $totalAmount,
                    'status' => 'pending',
                ]);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Pesanan berhasil dibuat',
                    'data' => [
                        'order_id' => $order->id,
                        'order_code' => $order->order_code,
                        'status' => $order->status,
                        'total_amount' => $order->total_amount,
                        'payment' => [
                            'id' => $payment->id,
                            'qr_string' => $payment->qr_string,
                            'status' => $payment->status,
                        ]
                    ]
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    // Public: Track orders by phone number
    public function track(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $customer = Customer::where('phone_number', $request->phone)->first();

        if (! $customer) {
            return response()->json([
                'status' => 'success',
                'data' => []
            ]);
        }

        $orders = Order::where('customer_id', $customer->id)
            ->with(['items.product'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Public: Detail of a single order
    public function show($order_code)
    {
        $order = Order::where('order_code', $order_code)
            ->with(['items.product', 'payments', 'note', 'customer'])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $order
        ]);
    }

    // Admin: List live orders
    public function adminIndex(Request $request)
    {
        $query = Order::with(['customer', 'items.product']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('order_code', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($c) use ($search) {
                      $c->where('phone_number', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Admin: Update order status
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:menunggu_pembayaran,diproses,selesai,siap_diambil,dibatalkan'
        ]);

        $order = Order::findOrFail($id);
        $oldStatus = $order->status;
        $newStatus = $request->status;

        if ($oldStatus === $newStatus) {
            return response()->json([
                'status' => 'success',
                'message' => 'Status pesanan tidak berubah',
                'data' => $order
            ]);
        }

        try {
            DB::transaction(function () use ($order, $oldStatus, $newStatus) {
                $order->status = $newStatus;
                $order->save();

                // If status transitions to "siap_diambil" or "selesai", credit stamp
                if (in_array($newStatus, ['siap_diambil', 'selesai'])) {
                    // Check if stamp already exists for this order
                    $stampExists = Stamp::where('order_id', $order->id)->exists();

                    if (! $stampExists) {
                        // Create loyalty stamp
                        Stamp::create([
                            'customer_id' => $order->customer_id,
                            'order_id' => $order->id,
                            'stamp_count' => 1,
                            'redeemed' => false,
                        ]);

                        // Update customer stamps count
                        $customer = $order->customer;
                        $customer->total_stamps += 1;
                        $customer->save();
                    }
                }
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Status pesanan berhasil diperbarui',
                'data' => $order->load(['customer'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
