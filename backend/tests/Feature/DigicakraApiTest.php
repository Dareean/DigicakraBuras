<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Product;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DigicakraApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed products for testing
        Product::create([
            'name' => 'Pulpen Pilot Black',
            'price' => 3500.00,
            'stock_qty' => 100,
            'category' => 'Alat Tulis',
            'is_active' => true,
        ]);

        // Seed inventory materials
        InventoryItem::create([
            'item_name' => 'Kertas HVS A4 70gsm (Cetak/Copy)',
            'unit' => 'Rim',
            'current_qty' => 50,
            'min_threshold' => 10,
        ]);

        InventoryItem::create([
            'item_name' => 'Tinta Printer Epson Black (003)',
            'unit' => 'Botol',
            'current_qty' => 15,
            'min_threshold' => 3,
        ]);

        // Seed admin user
        Admin::create([
            'name' => 'Bu Herlina (Owner)',
            'email' => 'owner@cakrawala.id',
            'password' => 'owner123', // Hash will automatically cast in model attribute
            'role' => 'owner',
        ]);
    }

    public function test_get_active_products_list()
    {
        $response = $this->getJson('/api/v1/products');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'status',
                     'data' => [
                         '*' => ['id', 'name', 'price', 'stock_qty', 'category', 'is_active']
                     ]
                 ]);
        
        $this->assertEquals('Pulpen Pilot Black', $response->json('data.0.name'));
    }

    public function test_create_print_order_calculates_price_correctly()
    {
        $payload = [
            'phone_number' => '08123456789',
            'name' => 'Rina Mahasiswi',
            'order_type' => 'print',
            'pickup_note' => 'Jilid mika biru',
            'items' => [
                [
                    'item_type' => 'print_doc',
                    'qty' => 2, // 2 copies
                    'file_url' => 'Skripsi.pdf',
                    'spec_json' => [
                        'paper_size' => 'A4',
                        'color_type' => 'grayscale', // Rp 500 per page
                        'binding_type' => 'mika', // Rp 5.000 binding
                        'page_count' => 10, // 10 pages
                    ]
                ]
            ]
        ];

        // Print cost: 10 pages * Rp 500 = Rp 5.000
        // Binding cost: Rp 5.000
        // Unit cost: Rp 5.000 + Rp 5.000 = Rp 10.000
        // Total cost: Rp 10.000 * 2 copies = Rp 20.000

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
                 ->assertJson([
                     'status' => 'success',
                     'data' => [
                         'status' => 'menunggu_pembayaran',
                         'total_amount' => 20000.00
                     ]
                 ]);

        $this->assertDatabaseHas('orders', [
            'order_code' => $response->json('data.order_code'),
            'total_amount' => 20000.00,
        ]);
    }

    public function test_payment_webhook_updates_status_and_deducts_inventory()
    {
        // 1. Create customer and order first
        $customer = \App\Models\Customer::create([
            'phone_number' => '08123456789',
            'name' => 'Rina Mahasiswi',
        ]);

        $order = Order::create([
            'order_code' => 'ORD-TEST123',
            'customer_id' => $customer->id,
            'order_type' => 'print',
            'status' => 'menunggu_pembayaran',
            'total_amount' => 20000.00,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'payment_gateway_ref' => 'PAY-TEST123',
            'qr_string' => 'qris://simulated-qr',
            'amount' => 20000.00,
            'status' => 'pending',
        ]);

        \App\Models\OrderItem::create([
            'order_id' => $order->id,
            'item_type' => 'print_doc',
            'qty' => 1,
            'file_url' => 'test.pdf',
            'spec_json' => [
                'paper_size' => 'A4',
                'color_type' => 'grayscale',
                'binding_type' => 'none',
                'page_count' => 10,
            ],
            'unit_price' => 20000.00,
            'subtotal' => 20000.00,
        ]);

        // 2. Trigger webhook success
        $webhookPayload = [
            'order_code' => 'ORD-TEST123',
            'status' => 'success',
            'payment_ref' => 'GATEWAY-REF-123',
        ];

        $response = $this->postJson('/api/v1/payments/webhook', $webhookPayload);

        $response->assertStatus(200)
                 ->assertJson([
                     'status' => 'success',
                     'data' => [
                         'order_code' => 'ORD-TEST123',
                         'order_status' => 'diproses',
                         'payment_status' => 'success',
                     ]
                 ]);

        // 3. Assert Database states updated
        $this->assertDatabaseHas('orders', [
            'order_code' => 'ORD-TEST123',
            'status' => 'diproses',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'success',
        ]);

        // 4. Assert inventory deducted
        // Total pages = 10 * 1 = 10 pages.
        // Paper deduct: ceil(10/500) = 1 rim.
        // Original: 50 rim. New: 49 rim.
        $this->assertDatabaseHas('inventory_items', [
            'item_name' => 'Kertas HVS A4 70gsm (Cetak/Copy)',
            'current_qty' => 49,
        ]);
    }

    public function test_admin_login_returns_token()
    {
        $payload = [
            'email' => 'owner@cakrawala.id',
            'password' => 'owner123',
        ];

        $response = $this->postJson('/api/v1/admin/login', $payload);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'status',
                     'token',
                     'admin' => ['name', 'email', 'role']
                 ])
                 ->assertJson([
                     'status' => 'success',
                     'admin' => [
                         'email' => 'owner@cakrawala.id',
                         'role' => 'owner',
                     ]
                 ]);
    }
}
