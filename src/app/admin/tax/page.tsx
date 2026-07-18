"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";

interface TaxOrder {
  id: number;
  orderCode: string;
  orderSource: string;
  totalAmount: number;
  status: string;
  customerName: string;
  createdAt: string;
}

interface TaxReportData {
  period: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  ppnRate: number;
  ppnAmount: number;
  pphRate: number;
  pphAmount: number;
  ordersCount: number;
  orders: TaxOrder[];
}

export default function AdminTax() {
  const [report, setReport] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("bulanan"); // harian | mingguan | bulanan
  const [dateParam, setDateParam] = useState(""); // empty defaults to current date
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Edit rates state
  const [showSettings, setShowSettings] = useState(false);
  const [ppnRateInput, setPpnRateInput] = useState(11.0);
  const [pphRateInput, setPphRateInput] = useState(0.5);
  const [submittingSettings, setSubmittingSettings] = useState(false);

  // Excel export state
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      query.append("period", period);
      if (dateParam) query.append("date", dateParam);

      const res = await fetch(`/api/admin/reports/tax/export?${query.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Gagal membuat file Excel", "error");
        return;
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `laporan_pajak.xlsx`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showToast("Kesalahan jaringan saat mengunduh laporan", "error");
    } finally {
      setExporting(false);
    }
  };

  const loadTaxReport = () => {
    setLoading(true);
    const query = new URLSearchParams();
    query.append("period", period);
    if (dateParam) query.append("date", dateParam);

    fetch(`/api/admin/reports/tax?${query.toString()}`)
      .then(async (res) => {
        if (res.status === 403) {
          showToast("Akses Ditolak: Hanya Owner yang dapat mengakses menu Pajak.", "error");
          setTimeout(() => {
            window.location.href = "/admin";
          }, 1500);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          console.error("Tax report API error:", data);
          showToast(data.error || "Gagal memuat laporan pajak", "error");
          setLoading(false);
          return;
        }
        // Coerce Prisma Decimal → number (PostgreSQL/Supabase compatibility)
        setReport({
          ...data,
          totalRevenue: Number(data.totalRevenue),
          ppnRate:      Number(data.ppnRate),
          ppnAmount:    Number(data.ppnAmount),
          pphRate:      Number(data.pphRate),
          pphAmount:    Number(data.pphAmount),
          orders: (data.orders ?? []).map((o: any) => ({
            ...o,
            totalAmount: Number(o.totalAmount),
          })),
        });
        setPpnRateInput(Number(data.ppnRate));
        setPphRateInput(Number(data.pphRate));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTaxReport();
  }, [period, dateParam]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSettings(true);

    try {
      // Update PPN
      await fetch("/api/admin/settings/tax-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxType: "ppn", ratePercent: Number(ppnRateInput) }),
      });

      // Update PPh
      const res = await fetch("/api/admin/settings/tax-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxType: "pph", ratePercent: Number(pphRateInput) }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Tarif pajak berhasil diperbarui!", "success");
        setShowSettings(false);
        loadTaxReport();
      } else {
        showToast(data.error || "Gagal memperbarui tarif pajak", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Kesalahan jaringan", "error");
    } finally {
      setSubmittingSettings(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Title & Configure button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Kalkulasi Estimasi Pajak & Keuangan</h1>
            <p className="text-slate-500 text-xs mt-0.5">Alat bantu hitung & rekap otomatis PPN & PPh dari omzet transaksi toko.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
               Konfigurasi Tarif
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold shadow transition-all flex items-center gap-1.5"
            >
              {exporting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Membuat Excel...
                </>
              ) : (
                <>
                   Export Excel (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settings view panel */}
        {showSettings && (
          <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4 max-w-md animate-fade-in text-xs">
            <h3 className="font-bold text-slate-800 text-sm">Konfigurasi Tarif Pajak (Owner Only)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tarif PPN (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ppnRateInput}
                  onChange={(e) => setPpnRateInput(Number(e.target.value))}
                  className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tarif PPh Final UMKM (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pphRateInput}
                  onChange={(e) => setPphRateInput(Number(e.target.value))}
                  className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="submit"
                disabled={submittingSettings}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all shadow"
              >
                {submittingSettings ? "Menyimpan..." : "Simpan Tarif"}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Toolbar selectors */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period select */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Periode:</span>
              <div className="flex p-0.5 bg-slate-100 rounded border border-slate-200">
                {["harian", "mingguan", "bulanan"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      setDateParam(""); // reset date when switching period
                    }}
                    className={`py-1 px-3 text-[10px] font-bold rounded capitalize transition-all ${
                      period === p
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Date filter select input */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pilih Tanggal:</span>
              <input
                type={period === "bulanan" ? "month" : "date"}
                value={dateParam}
                onChange={(e) => setDateParam(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Content Report */}
        {loading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Menghitung laporan pajak...</p>
          </div>
        ) : report ? (
          <div className="space-y-6" id="tax-report-print">
            
            {/* Tax Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Revenue */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omzet Kotor Terhitung</span>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-900 block">
                    Rp {report.totalRevenue.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Dari {report.ordersCount} transaksi lunas
                  </span>
                </div>
              </div>

              {/* Card 2: PPN */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi PPN ({report.ppnRate}%)</span>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-red-600 block">
                    Rp {Math.round(report.ppnAmount).toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Pajak Pertambahan Nilai
                  </span>
                </div>
              </div>

              {/* Card 3: PPh */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi PPh Final ({report.pphRate}%)</span>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-amber-600 block">
                    Rp {Math.round(report.pphAmount).toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Pajak Penghasilan Final PP 23/PP 55
                  </span>
                </div>
              </div>

            </div>

            {/* Disclaimer banner */}
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-500 leading-relaxed italic">
               **Disclaimer:** Laporan perpajakan ini murni merupakan alat bantu hitung rekapitulasi keuangan internal untuk Fotocopy Cakrawala, dan tidak terafiliasi dengan sistem pelaporan pajak resmi Direktorat Jenderal Pajak (e-Faktur/DJP).
            </div>

            {/* Transactions table list included in this tax query */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Transaksi Periode</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Dari {new Date(report.startDate).toLocaleDateString("id-ID")} s.d. {new Date(report.endDate).toLocaleDateString("id-ID")}
                </p>
              </div>

              {report.orders.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-10">Tidak ada transaksi lunas di periode ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Kode Order</th>
                        <th className="px-6 py-3">Tanggal</th>
                        <th className="px-6 py-3">Pelanggan</th>
                        <th className="px-6 py-3">Sumber</th>
                        <th className="px-6 py-3 text-right">Nilai Transaksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {report.orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-bold text-slate-800">{o.orderCode}</td>
                          <td className="px-6 py-3.5 text-slate-400">
                            {new Date(o.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-3.5">{o.customerName}</td>
                          <td className="px-6 py-3.5 uppercase text-[9px] font-bold">
                            {o.orderSource === "pos" ? "POS" : "Online"}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                            Rp {o.totalAmount.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : null}

      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-center p-4 bg-slate-900/95 text-white rounded-lg shadow-2xl border-l-4 border-emerald-500 backdrop-blur-md max-w-sm transition-all duration-300">
          <div className="mr-3 flex-shrink-0">
            {toast.type === "success" ? (
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="bg-red-500/20 text-red-400 p-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <div className="text-xs font-bold">{toast.message}</div>
        </div>
      )}
    </AdminLayout>
  );
}
