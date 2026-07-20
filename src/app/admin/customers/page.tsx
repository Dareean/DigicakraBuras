"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Gift, CheckCircle, Loader2 } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  whatsappNumber: string;
  totalStamps: number;
  rewardsEarned: number;
  rewardsClaimed: number;
  createdAt: string;
  transactionCount: number;
  lastTransactionDate: string | null;
  orders: Array<{
    id: number;
    orderCode: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    setLoading(true);
    fetch("/api/admin/customers")
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const claimReward = async (customerId: number, customerName: string) => {
    setClaimingId(customerId);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/claim-reward`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setClaimToast(data.message);
        loadCustomers(); // refresh daftar
        // Update selectedCust jika sedang terbuka
        setSelectedCust((prev) =>
          prev?.id === customerId
            ? { ...prev, rewardsClaimed: prev.rewardsClaimed + 1 }
            : prev
        );
      } else {
        setClaimToast(data.error || "Gagal mengklaim reward.");
      }
    } catch {
      setClaimToast("Kesalahan koneksi.");
    } finally {
      setClaimingId(null);
      setTimeout(() => setClaimToast(null), 4000);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Data Pelanggan & Loyalitas</h1>
          <p className="text-slate-500 text-xs mt-0.5">Kelola data stempel digital pelanggan serta tinjau histori riwayat transaksi.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Memuat data pelanggan...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Customers Table (7 columns) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Pelanggan</th>
                      <th className="px-6 py-4 text-center">Stempel Aktif</th>
                      <th className="px-6 py-4 text-center">Jumlah Transaksi</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/50 cursor-pointer ${
                          selectedCust?.id === c.id ? "bg-red-50/10" : ""
                        }`}
                        onClick={() => setSelectedCust(c)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 block">{c.name || "Tanpa Nama"}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{c.whatsappNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                          {(() => {
                            const hasPendingReward = c.rewardsEarned > c.rewardsClaimed;
                            const currentCycleStamps = c.totalStamps % 10;
                            const displayStamps = hasPendingReward && currentCycleStamps === 0 ? 10 : currentCycleStamps;
                            return (
                              <>
                                <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] border ${
                                  hasPendingReward
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-600 border-red-150"
                                }`}>
                                  {displayStamps} / 10
                                </span>
                                {hasPendingReward && (
                                  <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-bold">
                                    <Gift size={11} /> Reward!
                                  </span>
                                )}
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                  Akumulasi: {c.totalStamps}
                                  {c.rewardsClaimed > 0 && (
                                    <> &bull; Diklaim: {c.rewardsClaimed}x</>
                                  )}
                                </p>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                          {c.transactionCount} kali
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Tombol Klaim Reward — hanya muncul jika ada reward pending */}
                            {c.rewardsEarned > c.rewardsClaimed && (
                              <button
                                type="button"
                                disabled={claimingId === c.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  claimReward(c.id, c.name || c.whatsappNumber);
                                }}
                                className="inline-flex items-center gap-1 py-1 px-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded text-[10px] font-bold transition-all shadow-sm"
                              >
                                {claimingId === c.id ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Gift size={11} />
                                )}
                                Klaim
                              </button>
                            )}
                            {c.rewardsEarned > 0 && c.rewardsEarned === c.rewardsClaimed && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                                <CheckCircle size={11} /> Terklaim
                              </span>
                            )}
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline"
                            >
                              Detail &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Customer Transaction History (5 columns) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              {selectedCust ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Riwayat Transaksi</span>
                    <h2 className="text-sm font-extrabold text-slate-800 mt-1">{selectedCust.name || "Walk-in"}</h2>
                    <p className="text-xs text-slate-500">{selectedCust.whatsappNumber}</p>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedCust.orders.map((o) => (
                      <div key={o.id} className="text-xs flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-b-0 last:pb-0">
                        <div>
                          <span className="font-bold text-slate-800">{o.orderCode}</span>
                          <p className="text-[9px] text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="font-extrabold text-slate-900 block">
                            Rp {o.totalAmount.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs italic">
                  Pilih pelanggan di tabel sebelah kiri untuk melihat riwayat transaksi lengkap.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Claim Reward Toast */}
      {claimToast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 p-4 bg-slate-900/95 text-white rounded-lg shadow-2xl border-l-4 border-amber-400 backdrop-blur-md max-w-sm">
          <CheckCircle size={18} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs font-bold">{claimToast}</span>
        </div>
      )}
    </AdminLayout>
  );
}
