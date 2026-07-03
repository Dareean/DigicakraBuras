<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\InventoryItem;
use App\Models\TaxReport;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // Admin: Get summary metrics for admin dashboard
    public function dashboardSummary()
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Paid status: anything except pending payment or cancelled
        $paidStatuses = ['diproses', 'selesai', 'siap_diambil'];

        // 1. Revenue today
        $revenueToday = Order::whereIn('status', $paidStatuses)
            ->whereDate('created_at', $today)
            ->sum('total_amount');

        // 2. Revenue this month
        $revenueThisMonth = Order::whereIn('status', $paidStatuses)
            ->where('created_at', '>=', $startOfMonth)
            ->sum('total_amount');

        // 3. Active orders count
        $activeOrdersCount = Order::whereIn('status', ['menunggu_pembayaran', 'diproses'])->count();

        // 4. Low stock items count (below threshold)
        $lowStockCount = InventoryItem::whereRaw('current_qty <= min_threshold')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'revenue_today' => (float)$revenueToday,
                'revenue_this_month' => (float)$revenueThisMonth,
                'active_orders_count' => $activeOrdersCount,
                'low_stock_count' => $lowStockCount
            ]
        ]);
    }

    // Admin: Get revenue details for chart (daily / monthly)
    public function revenueReport(Request $request)
    {
        $request->validate([
            'period' => 'required|in:harian,bulanan,tahunan'
        ]);

        $period = $request->period;
        $paidStatuses = ['diproses', 'selesai', 'siap_diambil'];
        $data = [];

        if ($period === 'harian') {
            // Get daily revenue for the last 30 days
            $startDate = Carbon::now()->subDays(29)->startOfDay();
            
            $revenueData = Order::whereIn('status', $paidStatuses)
                ->where('created_at', '>=', $startDate)
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total_amount) as total')
                )
                ->groupBy('date')
                ->orderBy('date', 'asc')
                ->get();

            // Populate all 30 days
            for ($i = 0; $i < 30; $i++) {
                $dateStr = Carbon::now()->subDays(29 - $i)->format('Y-m-d');
                $match = $revenueData->firstWhere('date', $dateStr);
                $data[] = [
                    'label' => Carbon::parse($dateStr)->format('d M'),
                    'value' => $match ? (float)$match->total : 0
                ];
            }
        } elseif ($period === 'bulanan') {
            // Get monthly revenue for the last 12 months
            $startDate = Carbon::now()->subMonths(11)->startOfMonth();

            $revenueData = Order::whereIn('status', $paidStatuses)
                ->where('created_at', '>=', $startDate)
                ->select(
                    DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                    DB::raw('SUM(total_amount) as total')
                )
                ->groupBy('month')
                ->orderBy('month', 'asc')
                ->get();

            for ($i = 0; $i < 12; $i++) {
                $monthObj = Carbon::now()->subMonths(11 - $i);
                $monthStr = $monthObj->format('Y-m');
                $match = $revenueData->firstWhere('month', $monthStr);
                $data[] = [
                    'label' => $monthObj->format('M Y'),
                    'value' => $match ? (float)$match->total : 0
                ];
            }
        } else {
            // Tahunan
            $revenueData = Order::whereIn('status', $paidStatuses)
                ->select(
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('SUM(total_amount) as total')
                )
                ->groupBy('year')
                ->orderBy('year', 'asc')
                ->get();

            foreach ($revenueData as $row) {
                $data[] = [
                    'label' => (string)$row->year,
                    'value' => (float)$row->total
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    // Admin (Owner only): Export simple tax administration reports (internal use)
    public function exportTaxReport(Request $request)
    {
        // Require owner role (will be enforced via Sanctum token abilities middleware in routes)
        $request->validate([
            'period' => 'required|in:harian,bulanan,tahunan',
            'period_value' => 'required|string', // e.g. "2026-07", "2026-07-02", "2026"
            'format' => 'required|in:pdf,xlsx,csv'
        ]);

        $period = $request->period;
        $value = $request->period_value;
        $paidStatuses = ['diproses', 'selesai', 'siap_diambil'];

        $query = Order::whereIn('status', $paidStatuses);

        if ($period === 'harian') {
            $query->whereDate('created_at', $value);
        } elseif ($period === 'bulanan') {
            // e.g. "2026-07"
            $yearMonth = explode('-', $value);
            $query->whereYear('created_at', $yearMonth[0])
                  ->whereMonth('created_at', $yearMonth[1]);
        } else {
            // Tahunan "2026"
            $query->whereYear('created_at', $value);
        }

        $orders = $query->with('customer')->orderBy('created_at', 'asc')->get();
        $totalRevenue = $orders->sum('total_amount');
        
        // Calculate tax estimation:
        // UMKM Simple Tax Rate (PPh Final PP 55/2022 = 0.5% of gross turnover)
        $estimatedTax = $totalRevenue * 0.005;

        // Generate a simulated file download url
        $filename = "rekap_pajak_{$period}_{$value}." . ($request->format === 'xlsx' ? 'xlsx' : ($request->format === 'csv' ? 'csv' : 'pdf'));
        
        // Cache the report
        $taxReport = TaxReport::create([
            'period_type' => $period,
            'period_value' => $value,
            'total_revenue' => $totalRevenue,
            'generated_at' => Carbon::now(),
            'file_url' => "/storage/reports/{$filename}",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Rekapitulasi pajak berhasil digenerate',
            'data' => [
                'report_id' => $taxReport->id,
                'period' => $period,
                'period_value' => $value,
                'total_revenue' => (float)$totalRevenue,
                'estimated_tax_pp55' => (float)$estimatedTax, // 0.5%
                'total_transactions' => $orders->count(),
                'file_url' => $taxReport->file_url,
                'generated_at' => $taxReport->generated_at->toDateTimeString(),
                'transactions' => $orders->map(function($o) {
                    return [
                        'date' => $o->created_at->toDateTimeString(),
                        'order_code' => $o->order_code,
                        'customer' => $o->customer->name ?? 'Guest',
                        'phone' => $o->customer->phone_number,
                        'amount' => (float)$o->total_amount,
                        'tax_portion' => (float)$o->total_amount * 0.005
                    ];
                })
            ]
        ]);
    }

    // Admin: List customers with their loyalty stamps
    public function customersIndex(Request $request)
    {
        $query = Customer::withCount('orders');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('phone_number', 'like', "%{$search}%");
        }

        $customers = $query->orderBy('total_stamps', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $customers
        ]);
    }
}
