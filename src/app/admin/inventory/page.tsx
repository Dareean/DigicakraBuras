"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";

interface InventoryLog {
  id: number;
  changeQty: number;
  reason: string;
  createdAt: string;
}

interface InventoryItem {
  id: number;
  itemName: string;
  unit: string;
  currentQty: number;
  minThreshold: number;
  logs: InventoryLog[];
}

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Restock modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockReason, setRestockReason] = useState("Restok rutin");
  const [submitting, setSubmitting] = useState(false);

  const loadInventory = () => {
    fetch("/api/admin/inventory")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQty(5);
    setRestockReason("Restok bulanan");
    setShowModal(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/inventory/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeQty: Number(restockQty),
          reason: restockReason.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        loadInventory();
      } else {
        alert(data.error || "Gagal melakukan restok");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Persediaan Bahan Operasional</h1>
          <p className="text-slate-500 text-xs mt-0.5">Kelola stok kertas dan tinta operasional mesin cetak, serta pantau histori pemakaian.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Memuat data bahan...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Material Cards (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Bahan Aktif</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {items.map((item) => {
                  const isLow = item.currentQty <= item.minThreshold;
                  return (
                    <div
                      key={item.id}
                      className={`bg-white p-6 rounded-lg border shadow-sm flex flex-col justify-between h-44 hover:shadow-md transition-all ${
                        isLow ? "border-amber-300 border-l-4 border-l-amber-500" : "border-slate-250"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Bahan Cetak
                        </span>
                        <h3 className="text-base font-extrabold text-slate-800">{item.itemName}</h3>
                        {isLow && (
                          <span className="inline-block text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 uppercase mt-1 animate-pulse">
                            Stok Menipis!
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-baseline pt-4">
                        <div>
                          <span className="text-3xl font-extrabold text-slate-900">
                            {item.currentQty}
                          </span>
                          <span className="text-xs text-slate-500 ml-1.5 font-bold">{item.unit}</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => openRestockModal(item)}
                          className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold shadow transition-all"
                        >
                          Restok
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: History Log (5 columns) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histori Pemakaian & Restok</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Catatan mutasi keluar masuk bahan operasional.</p>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {items.flatMap((item) =>
                  item.logs.map((log) => ({
                    ...log,
                    itemName: item.itemName,
                    unit: item.unit,
                  }))
                )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 15) // take top 15 logs
                  .map((log) => {
                    const isPositive = log.changeQty > 0;
                    return (
                      <div key={log.id} className="text-xs flex justify-between items-start pb-3 border-b border-slate-50 last:border-b-0 last:pb-0">
                        <div>
                          <span className="font-bold text-slate-800">{log.itemName}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Sebab: {log.reason}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span className={`font-extrabold text-[11px] ${isPositive ? "text-emerald-600" : "text-amber-700"}`}>
                          {isPositive ? "+" : ""}{log.changeQty} {log.unit}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Restock Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 space-y-4 border-t-8 border-t-slate-900">
            <div>
              <h3 className="text-base font-bold text-slate-800">Restok: {selectedItem.itemName}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Masukkan jumlah restok barang dan alasannya.</p>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Jumlah Tambahan ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Alasan Restok
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white"
                  required
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center"
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5"></div>
                  )}
                  Simpan Stok
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
