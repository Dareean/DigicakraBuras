"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";

interface DashboardSummary {
  todayRevenue: number;
  monthRevenue: number;
  activeOrdersCount: number;
  lowStockItemsCount: number;
  weeklyChartData: Array<{ day: string; revenue: number }>;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/summary")
      .then((res) => res.json())
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading summary:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
          <p className="text-slate-500 text-xs">Memuat ringkasan data...</p>
        </div>
      </AdminLayout>
    );
  }

  const maxRevenue = summary?.weeklyChartData.reduce((max, d) => Math.max(max, d.revenue), 1) || 1;

  return (
    <AdminLayout>
      <div className="space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Ringkasan Operasional</h1>
          <p className="text-slate-500 text-xs mt-1">Pantau performa penjualan, stok bahan, dan status pesanan hari ini.</p>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Hari Ini</span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 block">
                Rp {summary?.todayRevenue.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Transaksi Lunas</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Bulan Ini</span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 block">
                Rp {summary?.monthRevenue.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Terhitung sejak tgl 1</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Antrean Pesanan Aktif</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-red-600">
                {summary?.activeOrdersCount}
              </span>
              <Link href="/admin/orders" className="text-[10px] text-slate-400 hover:text-red-600 hover:underline font-bold">
                Lihat Antrean &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemberitahuan Stok Menipis</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className={`text-3xl font-extrabold ${summary?.lowStockItemsCount && summary.lowStockItemsCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-700"}`}>
                {summary?.lowStockItemsCount}
              </span>
              <Link href="/admin/inventory" className="text-[10px] text-slate-400 hover:text-amber-600 hover:underline font-bold">
                Kelola Stok &rarr;
              </Link>
            </div>
          </div>

        </div>

        {/* Weekly Revenue custom bar chart */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Grafik Pendapatan Mingguan</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Statistik pendapatan harian selama 7 hari terakhir.</p>
          </div>

          <div className="flex justify-between items-end h-48 pt-4 px-2 border-b border-slate-100">
            {summary?.weeklyChartData.map((dayData, idx) => {
              // calculate percentage height
              const heightPercent = Math.max(5, Math.round((dayData.revenue / maxRevenue) * 100));
              return (
                <div key={idx} className="flex flex-col items-center w-1/8 space-y-2 group">
                  {/* Tooltip on hover */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow absolute transform -translate-y-8">
                    Rp {dayData.revenue.toLocaleString("id-ID")}
                  </span>
                  
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-8 bg-red-500 rounded-t group-hover:bg-red-600 transition-all shadow-sm flex items-end justify-center"
                  ></div>
                  
                  {/* Label */}
                  <span className="text-[10px] font-bold text-slate-400">
                    {dayData.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Akses Cepat Kasir</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/pos"
              className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50/10 transition-all group"
            >
              <div className="p-2 bg-red-100 text-red-600 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-red-600">Buka Layar Kasir (POS)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Input pelanggan walk-in</span>
              </div>
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50/10 transition-all group"
            >
              <div className="p-2 bg-red-100 text-red-600 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-red-600">Proses Antrean Jasa</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Verifikasi file & cetak</span>
              </div>
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50/10 transition-all group"
            >
              <div className="p-2 bg-red-100 text-red-600 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-red-600">Katalog Produk ATK</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kelola barang & stok jual</span>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
