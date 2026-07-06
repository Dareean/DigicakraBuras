"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Customer {
  id: number;
  name: string;
  whatsappNumber: string;
  totalStamps: number;
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

  useEffect(() => {
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
  }, []);

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
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-150 rounded-full font-extrabold text-[10px]">
                            {c.totalStamps % 10} stempel
                          </span>
                          <p className="text-[9px] text-slate-400 mt-0.5">Total akumulasi: {c.totalStamps}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                          {c.transactionCount} kali
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline"
                          >
                            Detail &rarr;
                          </button>
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
    </AdminLayout>
  );
}
