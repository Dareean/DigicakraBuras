"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Order {
  id: number;
  orderCode: string;
  orderSource: string;
  orderType: string;
  status: string;
  totalAmount: number;
  pickupNote: string;
  createdAt: string;
  customer: {
    name: string;
    whatsappNumber: string;
    totalStamps: number;
  } | null;
  items: Array<{
    id: number;
    itemType: string;
    productName: string | null;
    fileUrl: string | null;
    spec: any;
    qty: number;
    unitPrice: number;
    subtotal: number;
    addons: Array<{ addonType: string; price: number }>;
  }>;
  payment: {
    status: string;
    paymentMethod: string;
    paymentGatewayRef: string | null;
  } | null;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  const loadOrders = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter !== "all") query.append("status", statusFilter);
    if (sourceFilter !== "all") query.append("source", sourceFilter);
    if (search.trim() !== "") query.append("search", search.trim());

    fetch(`/api/admin/orders?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const updateOrderStatus = async (orderId: number, newStatus: string, orderObj?: Order) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      
      if (data.success) {
        // If status changed to siap_diambil, automatically open WA API chat
        if (newStatus === "siap_diambil" && orderObj) {
          sendWaNotification(orderObj);
        }
        // Refresh orders list
        loadOrders();
      } else {
        alert(data.error || "Gagal memperbarui status");
      }
    } catch (e) {
      console.error(e);
      alert("Kesalahan koneksi");
    }
  };

  const sendWaNotification = (order: Order) => {
    const waNum = order.customer?.whatsappNumber;
    if (!waNum) {
      alert("Pelanggan tidak memiliki nomor WhatsApp!");
      return;
    }
    
    let formattedNum = waNum.replace(/[^0-9]/g, "");
    if (formattedNum.startsWith("0")) {
      formattedNum = "62" + formattedNum.slice(1);
    }
    
    let message = "";
    const name = order.customer?.name || "Pelanggan";
    const code = order.orderCode;
    
    if (order.status === "diterima") {
      message = `Halo ${name}, pesanan Anda (${code}) telah kami terima dan masuk dalam antrean proses cetak. Terima kasih! - Fotocopy Cakrawala`;
    } else if (order.status === "diproses") {
      message = `Halo ${name}, pesanan Anda (${code}) sedang dalam proses pengerjaan oleh staf kami. - Fotocopy Cakrawala`;
    } else if (order.status === "siap_diambil") {
      message = `Halo ${name}, kabar baik! Pesanan Anda (${code}) sudah selesai diproses dan SIAP DIAMBIL di toko. Silakan datang ke toko untuk mengambil. Terima kasih! - Fotocopy Cakrawala`;
    } else if (order.status === "selesai") {
      message = `Halo ${name}, transaksi Anda (${code}) telah selesai diambil. Terima kasih telah mempercayai Fotocopy Cakrawala! - Fotocopy Cakrawala`;
    } else {
      message = `Halo ${name}, terkait pesanan Anda (${code})... - Fotocopy Cakrawala`;
    }
    
    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${formattedNum}?text=${encodedText}`;
    window.open(waUrl, "_blank");
  };

  const getStatusBadge = (order: Order) => {
    if (order.status === "menunggu_pembayaran" && order.payment?.paymentMethod === "manual_qris" && order.payment?.status === "pending") {
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-[10px] font-extrabold uppercase animate-pulse">Menunggu Verifikasi</span>;
    }
    switch (order.status) {
      case "menunggu_pembayaran":
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">Belum Bayar</span>;
      case "diterima":
        return <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-bold uppercase">Diterima</span>;
      case "diproses":
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">Diproses</span>;
      case "siap_diambil":
        return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold uppercase">Siap Diambil</span>;
      case "selesai":
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">Selesai</span>;
      case "dibatalkan":
        return <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">Batal</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">{order.status}</span>;
    }
  };

  const getSourceBadge = (source: string) => {
    return source === "pos" ? (
      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[9px] font-bold uppercase">Kasir POS</span>
    ) : (
      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[9px] font-bold uppercase">Online Web</span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Antrean Live Orders</h1>
            <p className="text-slate-500 text-xs mt-0.5">Kelola antrean cetak dokumen online dan transaksi walk-in kasir.</p>
          </div>
          <button
            onClick={loadOrders}
            className="self-start py-2 px-4 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
            </svg>
            Segarkan Data
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Select */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="menunggu_pembayaran">Belum Bayar</option>
                <option value="diterima">Diterima (Antre)</option>
                <option value="diproses">Sedang Diproses</option>
                <option value="siap_diambil">Siap Diambil</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>

            {/* Source Select */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sumber:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="all">Semua Sumber</option>
                <option value="online">Online Web</option>
                <option value="pos">Kasir POS</option>
              </select>
            </div>

          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Cari kode, nama, WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-red-500 w-full sm:w-56 font-medium"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 shadow transition-all"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Memuat antrean...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
            <p className="text-slate-500 text-xs">Tidak ada antrean pesanan yang cocok dengan kriteria filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-150 hover:border-slate-350 transition-all">
                
                {/* 1. Left side: Order code, customer, source, total */}
                <div className="p-6 md:w-1/3 flex flex-col justify-between space-y-4 bg-slate-50/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-800">{order.orderCode}</span>
                      {getStatusBadge(order)}
                      {getSourceBadge(order.orderSource)}
                    </div>
                    
                    <div className="text-xs space-y-0.5 text-slate-600">
                      <p className="font-bold text-slate-800">
                        {order.customer?.name || "Walk-in Customer"}
                      </p>
                      <p className="text-slate-500">{order.customer?.whatsappNumber || "-"}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 flex justify-between items-baseline">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total:</span>
                    <span className="text-base font-extrabold text-red-600">
                      Rp {order.totalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* 2. Middle side: Items, specs, addons */}
                <div className="p-6 md:w-1/2 flex-grow space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rincian Pekerjaan</span>
                  
                  <div className="space-y-3 divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-xs pt-2 first:pt-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">
                              {item.itemType === "atk" ? (item.productName || "Item ATK") : `Print: ${item.fileUrl}`}
                            </span>
                            {item.itemType === "print_doc" && (
                              <div className="text-slate-400 text-[11px] mt-0.5 space-y-0.5">
                                <p>Spec: {item.spec.pages} Hal, {item.spec.color === "bw" ? "Hitam Putih" : "Warna"}</p>
                                {item.spec.printedPages && (
                                  <p className="text-red-600 font-bold text-[10px]">
                                    Halaman dicetak: {item.spec.printedPages.join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Addons display */}
                            {item.addons && item.addons.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap mt-1.5">
                                {item.addons.map((a, aIdx) => (
                                  <span key={aIdx} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase border border-red-100">
                                    {a.addonType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-slate-600">x{item.qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.pickupNote && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 italic">
                      " {order.pickupNote} "
                    </div>
                  )}
                </div>

                {/* 3. Right side: Action transitions */}
                <div className="p-6 md:w-60 flex flex-col justify-center space-y-2.5 bg-slate-50/20">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-1">Status Progres</span>
                  
                  {order.status === "diterima" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "diproses")}
                      className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                    >
                      Mulai Proses Cetak
                    </button>
                  )}

                  {order.status === "diproses" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "siap_diambil", order)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                    >
                      Tandai Siap Diambil
                    </button>
                  )}

                  {order.status === "siap_diambil" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "selesai")}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                    >
                      Tandai Selesai / Diambil
                    </button>
                  )}

                  {order.status === "menunggu_pembayaran" && (
                    <>
                      {order.payment?.paymentMethod === "manual_qris" && order.payment?.status === "pending" ? (
                        <div className="space-y-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptImage(order.payment?.paymentGatewayRef || null)}
                            className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-250 text-amber-800 border border-amber-300 rounded text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1"
                          >
                            👁️ Lihat Bukti QRIS
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, "diterima")}
                            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                          >
                            Setujui Pembayaran
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, "diterima")}
                          className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                        >
                          Konfirmasi Bayar Manual
                        </button>
                      )}
                    </>
                  )}

                  {order.status !== "selesai" && order.status !== "dibatalkan" && (
                    <button
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin membatalkan pesanan ${order.orderCode}?`)) {
                          updateOrderStatus(order.id, "dibatalkan");
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded text-[11px] font-bold transition-all text-center"
                    >
                      Batalkan Pesanan
                    </button>
                  )}

                  {order.customer?.whatsappNumber && (
                    <button
                      onClick={() => sendWaNotification(order)}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm mt-1"
                    >
                      💬 Kirim Notif WA
                    </button>
                  )}
                  
                  {order.status === "selesai" && (
                    <div className="text-center py-2 text-emerald-600 text-xs font-extrabold flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Pesanan Selesai
                    </div>
                  )}

                  {order.status === "dibatalkan" && (
                    <div className="text-center py-2 text-slate-400 text-xs font-extrabold">
                      Pesanan Dibatalkan
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Receipt Preview Modal */}
      {selectedReceiptImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-5 space-y-4 border-t-8 border-t-amber-500 text-xs relative text-center">
            <button
              type="button"
              onClick={() => setSelectedReceiptImage(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Bukti Transfer Pembayaran</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Unggahan Bukti QRIS Pelanggan</p>
            </div>
            <div className="border border-slate-200 rounded p-2 bg-slate-50 flex items-center justify-center max-h-[360px] overflow-hidden">
              <img src={selectedReceiptImage} className="max-w-full max-h-[320px] object-contain rounded shadow-sm" alt="Bukti Transfer Upload" />
            </div>
            <button
              type="button"
              onClick={() => setSelectedReceiptImage(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white rounded font-bold transition-all text-center"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
