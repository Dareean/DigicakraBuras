"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import gsap from "gsap";
import { Calculator, ClipboardList, ShoppingBag } from "lucide-react";

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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading summary:", err);
        setLoading(false);
      });
  }, []);

  // GSAP animation when summary loads
  useEffect(() => {
    if (!loading && summary) {
      // Summary cards
      gsap.fromTo(".dash-anim-card",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out", overwrite: "auto" }
      );
      // Bar chart: animate via clipPath agar tidak conflict dengan Tailwind transform utilities
      gsap.fromTo(".chart-anim-bar",
        { clipPath: "inset(100% 0 0 0)" },
        { clipPath: "inset(0% 0 0 0)", duration: 0.7, ease: "power2.out", stagger: 0.08, delay: 0.2, overwrite: "auto" }
      );
    }
  }, [loading, summary]);

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

  const maxRevenue = summary?.weeklyChartData?.reduce((max, d) => Math.max(max, d.revenue), 1) || 1;

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
          <div className="dash-anim-card opacity-0 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Hari Ini</span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 block">
                Rp {(summary?.todayRevenue ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Transaksi Lunas</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="dash-anim-card opacity-0 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Bulan Ini</span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 block">
                Rp {(summary?.monthRevenue ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Terhitung sejak tgl 1</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="dash-anim-card opacity-0 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Antrean Pesanan Aktif</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-red-600">
                {summary?.activeOrdersCount ?? 0}
              </span>
              <Link href="/admin/orders" className="text-[10px] text-slate-400 hover:text-red-600 hover:underline font-bold">
                Lihat Antrean &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="dash-anim-card opacity-0 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemberitahuan Stok Menipis</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className={`text-3xl font-extrabold ${(summary?.lowStockItemsCount ?? 0) > 0 ? "text-amber-600 animate-pulse" : "text-slate-700"}`}>
                {summary?.lowStockItemsCount ?? 0}
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

          {/* Container chart: h-48 fixed, items-end agar bar tumbuh dari bawah */}
          <div className="flex justify-around items-end h-48 border-b border-slate-100 pb-0">
            {summary?.weeklyChartData?.map((dayData, idx) => {
              const heightPercent = Math.max(4, Math.round((dayData.revenue / maxRevenue) * 100));
              const isToday = idx === (summary?.weeklyChartData?.length ?? 0) - 1;
              return (
                <div key={idx} className="relative flex flex-col items-center gap-1.5 group" style={{ height: "100%", justifyContent: "flex-end" }}>

                  {/* Tooltip hover */}
                  {dayData.revenue > 0 && (
                    <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                      Rp {dayData.revenue.toLocaleString("id-ID")}
                    </span>
                  )}

                  {/* Bar — clipPath animation dari bawah ke atas */}
                  <div
                    className="chart-anim-bar w-7 rounded-t transition-colors shadow-sm"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: isToday ? "#dc2626" : dayData.revenue > 0 ? "#f87171" : "#e2e8f0",
                    }}
                  />

                  {/* Label hari */}
                  <span className={`text-[10px] font-bold ${isToday ? "text-red-600" : "text-slate-400"}`}>
                    {dayData.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-600"></span> Hari ini</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-300"></span> Ada pendapatan</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-slate-200"></span> Tidak ada transaksi</span>
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
              <div className="p-2 bg-red-100 text-red-600 rounded flex items-center justify-center">
                <Calculator className="w-5 h-5" />
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
              <div className="p-2 bg-red-100 text-red-600 rounded flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
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
              <div className="p-2 bg-red-100 text-red-600 rounded flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
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
