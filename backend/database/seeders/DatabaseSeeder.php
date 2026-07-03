<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Product;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Admins
        Admin::create([
            'name' => 'Bu Herlina (Owner)',
            'email' => 'owner@cakrawala.id',
            'password' => Hash::make('owner123'),
            'role' => 'owner',
        ]);

        Admin::create([
            'name' => 'Staff Operasional',
            'email' => 'staff@cakrawala.id',
            'password' => Hash::make('staff123'),
            'role' => 'staff',
        ]);

        // 2. Seed ATK Products
        $products = [
            [
                'name' => 'Kertas HVS A4 80gr Sinar Dunia',
                'price' => 45000.00,
                'stock_qty' => 20,
                'category' => 'Kertas',
                'is_active' => true,
            ],
            [
                'name' => 'Pulpen Pilot Ballpoint Black',
                'price' => 3500.00,
                'stock_qty' => 100,
                'category' => 'Alat Tulis',
                'is_active' => true,
            ],
            [
                'name' => 'Buku Tulis Kiky 58 Lembar',
                'price' => 6000.00,
                'stock_qty' => 50,
                'category' => 'Buku',
                'is_active' => true,
            ],
            [
                'name' => 'Pensil Faber-Castell 2B',
                'price' => 4500.00,
                'stock_qty' => 80,
                'category' => 'Alat Tulis',
                'is_active' => true,
            ],
            [
                'name' => 'Penggaris Plastik Butterfly 30cm',
                'price' => 3000.00,
                'stock_qty' => 30,
                'category' => 'Lain-lain',
                'is_active' => true,
            ],
            [
                'name' => 'Penghapus Joyko EB-30',
                'price' => 2000.00,
                'stock_qty' => 60,
                'category' => 'Alat Tulis',
                'is_active' => true,
            ],
            [
                'name' => 'Stopmap Kertas Folio Diamond (Pcs)',
                'price' => 1500.00,
                'stock_qty' => 150,
                'category' => 'Kertas',
                'is_active' => true,
            ],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }

        // 3. Seed Inventory Items (Operational Supplies)
        $inventoryItems = [
            [
                'item_name' => 'Kertas HVS A4 70gsm (Cetak/Copy)',
                'unit' => 'Rim',
                'current_qty' => 50,
                'min_threshold' => 10,
            ],
            [
                'item_name' => 'Kertas HVS F4 70gsm (Cetak/Copy)',
                'unit' => 'Rim',
                'current_qty' => 40,
                'min_threshold' => 10,
            ],
            [
                'item_name' => 'Tinta Printer Epson Black (003)',
                'unit' => 'Botol',
                'current_qty' => 15,
                'min_threshold' => 3,
            ],
            [
                'item_name' => 'Tinta Printer Epson Color Set (003)',
                'unit' => 'Botol',
                'current_qty' => 8,
                'min_threshold' => 3,
            ],
            [
                'item_name' => 'Mika Plastik Jilid A4',
                'unit' => 'Pack',
                'current_qty' => 12,
                'min_threshold' => 2,
            ],
            [
                'item_name' => 'Lakban Hitam Jilid 2 Inch',
                'unit' => 'Roll',
                'current_qty' => 8,
                'min_threshold' => 2,
            ],
        ];

        foreach ($inventoryItems as $item) {
            $invItem = InventoryItem::create($item);

            // Log the initial stock entry
            InventoryLog::create([
                'inventory_item_id' => $invItem->id,
                'change_qty' => $invItem->current_qty,
                'reason' => 'Inisialisasi Stok Awal',
            ]);
        }
    }
}
