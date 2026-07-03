<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    // Admin: List all inventory items
    public function index()
    {
        $items = InventoryItem::with(['logs' => function($query) {
            $query->orderBy('created_at', 'desc')->limit(10);
        }])->get();

        return response()->json([
            'status' => 'success',
            'data' => $items
        ]);
    }

    // Admin: Update stock manually (restock or adjustment)
    public function update(Request $request, $id)
    {
        $request->validate([
            'change_qty' => 'required|integer|not_in:0',
            'reason' => 'required|string|max:100',
        ]);

        $item = InventoryItem::findOrFail($id);

        try {
            DB::transaction(function () use ($item, $request) {
                $change = $request->change_qty;
                
                // Update quantity
                $item->current_qty = max(0, $item->current_qty + $change);
                $item->save();

                // Create log
                InventoryLog::create([
                    'inventory_item_id' => $item->id,
                    'change_qty' => $change,
                    'reason' => $request->reason,
                ]);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Stok inventori berhasil diperbarui',
                'data' => $item->load(['logs' => function($q) {
                    $q->orderBy('created_at', 'desc')->limit(5);
                }])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    // Admin: Get all inventory logs
    public function logs()
    {
        $logs = InventoryLog::with('item')
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return response()->json([
            'status' => 'success',
            'data' => $logs
        ]);
    }
}
