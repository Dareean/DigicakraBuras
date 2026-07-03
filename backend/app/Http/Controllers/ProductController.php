<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    // Public endpoint: List active products for customers
    public function index()
    {
        $products = Product::where('is_active', true)->get();
        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    // Admin endpoint: List all products (active or inactive)
    public function adminIndex(Request $request)
    {
        // Authorization check: Sanctum token should be present.
        $products = Product::all();
        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    // Admin endpoint: Create new product
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
            'stock_qty' => 'required|integer|min:0',
            'category' => 'required|string|max:50',
            'is_active' => 'boolean',
        ]);

        $product = Product::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Produk ATK berhasil ditambahkan',
            'data' => $product
        ], 201);
    }

    // Admin endpoint: Update product
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'price' => 'sometimes|numeric|min:0',
            'stock_qty' => 'sometimes|integer|min:0',
            'category' => 'sometimes|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Produk ATK berhasil diperbarui',
            'data' => $product
        ]);
    }

    // Admin endpoint: Delete product
    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Produk ATK berhasil dihapus'
        ]);
    }
}
