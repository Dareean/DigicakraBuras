"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import gsap from "gsap";
import { Award } from "lucide-react";

interface CustomerData {
  name: string;
  whatsappNumber: string;
  totalStamps: number;
}

interface OrderItem {
  id: number;
  orderCode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  pickupNote: string;
  items: any[];
  payment: {
    status: string;
    paymentMethod: string;
  } | null;
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const waQuery = searchParams ? searchParams.get("whatsapp") : "";

  const [whatsapp, setWhatsapp] = useState(waQuery || "");
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // E-Nota Modal
  const [selectedNotaOrder, setSelectedNotaOrder] = useState<OrderItem | null>(null);
  const [notaData, setNotaData] = useState<any | null>(null);
  const [loadingNota, setLoadingNota] = useState(false);

  // GSAP animation triggers when customer details populate
  useEffect(() => {
    if (customer) {
      // Columns
      gsap.fromTo(".tracking-anim-panel",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out", overwrite: "auto" }
      );
      // Stamps slots
      gsap.fromTo(".stamp-anim-slot",
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: "back.out(1.5)", overwrite: "auto", delay: 0.1 }
      );
    }
  }, [customer]);

  const fetchTrackingData = (waNumber: string) => {
    if (!waNumber.trim()) return;
    setLoading(true);
    setSearched(true);

    fetch(`/api/orders/track?whatsapp=${encodeURIComponent(waNumber.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customer) {
          setCustomer(data.customer);
          setOrders(data.orders);
        } else {
          setCustomer(null);
          setOrders([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (waQuery) {
      setWhatsapp(waQuery);
      fetchTrackingData(waQuery);
    }
  }, [waQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingData(whatsapp);
  };

  // Stepper timeline calculation helper
  const getTimelineStep = (status: string) => {
    switch (status) {
      case "menunggu_pembayaran":
        return 0;
      case "diterima":
        return 1;
      case "diproses":
        return 2;
      case "siap_diambil":
        return 3;
      case "selesai":
        return 4;
      default:
        return 1;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "menunggu_pembayaran": return "Menunggu Pembayaran";
      case "diterima": return "Pesanan Diterima";
      case "diproses": return "Sedang Diproses";
      case "siap_diambil": return "Siap Diambil";
      case "selesai": return "Selesai";
      case "dibatalkan": return "Dibatalkan";
      default: return status;
    }
  };

  // E-Nota Generator helper
  const openEnota = (order: OrderItem) => {
    setSelectedNotaOrder(order);
    setLoadingNota(true);
    
    fetch(`/api/orders/${order.orderCode}/note`)
      .then((res) => res.json())
      .then((data) => {
        setNotaData(data);
        setLoadingNota(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingNota(false);
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lacak Status Pesanan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Masukkan nomor WhatsApp Anda untuk melihat daftar pesanan, memantau proses pengerjaan, dan memeriksa stempel loyalitas Anda.
          </p>
        </div>

        {/* Search bar form */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
          <input
            type="tel"
            placeholder="Masukkan nomor WhatsApp (Contoh: 081234567890)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="flex-grow px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white font-medium"
            required
          />
          <button
            type="submit"
            className="px-6 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow-sm transition-all flex items-center justify-center"
          >
            Cari
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Mencari data pesanan...</p>
          </div>
        ) : searched ? (
          !customer ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm max-w-md mx-auto">
              <p className="text-slate-600 font-bold">Nomor WhatsApp tidak terdaftar</p>
              <p className="text-slate-400 text-xs mt-1">Silakan lakukan pemesanan online terlebih dahulu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Customer Profile & Stamps Board (1 Column width) */}
              <div className="tracking-anim-panel opacity-0 space-y-6 md:col-span-1">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Profil Pelanggan</span>
                    <h2 className="text-lg font-extrabold text-slate-800 mt-1">{customer.name}</h2>
                    <p className="text-xs text-slate-500">{customer.whatsappNumber}</p>
                  </div>

                  {/* Stamp Digital Grid (10 stamp slots) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Stempel Digital</span>
                      <span className="font-extrabold text-red-600">{customer.totalStamps % 10} / 10</span>
                    </div>

                    {/* Stamp slot grid */}
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const stampValue = customer.totalStamps % 10;
                        const isStamped = idx < (stampValue === 0 && customer.totalStamps > 0 ? 10 : stampValue);
                        return (
                          <div
                            key={idx}
                            className={`stamp-anim-slot opacity-0 aspect-square rounded-full flex items-center justify-center border text-[10px] font-bold transition-all relative ${
                              isStamped
                                ? "bg-red-50 border-red-500 text-red-600 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-300"
                            }`}
                          >
                            {isStamped ? (
                              <Award className="w-5 h-5 text-red-650" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-normal">
                      *Setiap 10 stempel digital yang terkumpul, Anda akan mendapatkan hadiah gratis atau potongan harga secara otomatis di kasir.
                    </p>

                    {customer.totalStamps >= 10 && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-[11px] text-emerald-800 font-bold leading-normal">
                         Selamat! Anda telah mencapai target stempel dan berhak atas promo reward di toko!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Orders status tracking timeline (2 Columns width) */}
              <div className="tracking-anim-panel opacity-0 space-y-6 md:col-span-2">
                <h3 className="text-base font-bold text-slate-800">Daftar Pesanan Anda</h3>

                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs">Belum ada transaksi tercatat untuk nomor ini.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => {
                      const currentStep = getTimelineStep(order.status);
                      const isOrderDibatalkan = order.status === "dibatalkan";

                      return (
                        <div key={order.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                          
                          {/* Card Header info */}
                          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                            <div>
                              <span className="font-extrabold text-slate-800 text-sm block">
                                {order.orderCode}
                              </span>
                              <span className="text-slate-400">
                                {new Date(order.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-slate-900 text-sm">
                                Rp {order.totalAmount.toLocaleString("id-ID")}
                              </span>
                              
                              {/* E-Nota trigger button */}
                              {(order.status === "selesai" || order.payment?.status === "success") && (
                                <button
                                  type="button"
                                  onClick={() => openEnota(order)}
                                  className="py-1 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 font-bold transition-all text-[11px]"
                                >
                                  E-Nota
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Stepper Timeline UI */}
                          <div className="p-6">
                            {isOrderDibatalkan ? (
                              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded font-bold">
                                Pesanan ini dibatalkan oleh admin/toko.
                              </div>
                            ) : order.status === "menunggu_pembayaran" ? (
                              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-md gap-3">
                                <div>
                                  <p className="text-xs font-bold text-amber-900">Menunggu Verifikasi Pembayaran</p>
                                  <p className="text-[11px] text-amber-700 mt-0.5">Silakan lakukan pembayaran QRIS untuk memproses pesanan Anda.</p>
                                </div>
                                <a
                                  href={`/checkout/${order.orderCode}`}
                                  className="py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                                >
                                  Bayar Sekarang
                                </a>
                              </div>
                            ) : (
                              /* Stepper timeline layout */
                              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 sm:gap-0">
                                
                                {/* Background Line */}
                                <div className="absolute left-[15px] sm:left-[10%] right-auto sm:right-[10%] top-[15px] sm:top-4 bottom-4 sm:bottom-auto w-0.5 sm:w-auto h-full sm:h-0.5 bg-slate-200 -z-10 hidden sm:block"></div>

                                {/* Step items */}
                                {[
                                  { step: 1, label: "Diterima" },
                                  { step: 2, label: "Diproses" },
                                  { step: 3, label: "Siap Diambil" },
                                  { step: 4, label: "Selesai" },
                                ].map((s) => {
                                  const isActive = currentStep >= s.step;
                                  return (
                                    <div key={s.step} className="flex sm:flex-col items-center gap-3 sm:gap-2 w-full sm:w-1/4">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm transition-all ${
                                        isActive
                                          ? "bg-red-600 border-red-600 text-white"
                                          : "bg-white border-slate-200 text-slate-400"
                                      }`}>
                                        {s.step}
                                      </div>
                                      <div className="text-left sm:text-center">
                                        <span className={`text-xs font-bold ${isActive ? "text-slate-800" : "text-slate-400"}`}>
                                          {s.label}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}

                              </div>
                            )}

                            {order.pickupNote && (
                              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                                <span className="font-semibold text-slate-700">Catatan :</span>
                                <p className="italic mt-1">"{order.pickupNote}"</p>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )
        ) : null}

        {/* E-Nota Printable Modal overlay */}
        {selectedNotaOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto border-t-8 border-t-red-600">
              
              {loadingNota ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
                  <p className="text-slate-500 text-xs">Mengunduh E-Nota...</p>
                </div>
              ) : notaData ? (
                <div className="p-8 space-y-6" id="printable-receipt">
                  
                  {/* Receipt Header */}
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h2 className="text-xl font-extrabold text-red-600 tracking-wider">FOTOCOPY CAKRAWALA</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Kota Palu, Sulawesi Tengah</p>
                    <p className="text-[10px] text-slate-400">WhatsApp: 081234567890</p>
                    
                    <div className="mt-4 flex justify-between text-[11px] text-slate-500 max-w-xs mx-auto">
                      <span>No: {notaData.receiptNumber}</span>
                      <span>{new Date(notaData.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="text-xs space-y-1 bg-slate-50 p-3 rounded border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pelanggan:</span>
                      <span className="font-bold text-slate-800">{notaData.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">No WhatsApp:</span>
                      <span className="font-bold text-slate-850">{notaData.customerWhatsApp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Metode Bayar:</span>
                      <span className="font-bold text-slate-850 uppercase">{notaData.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Rincian Item</span>
                    <div className="divide-y divide-slate-100">
                      {notaData.items.map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="py-2 flex justify-between">
                          <div>
                            <span className="font-bold text-slate-800">{item.name}</span>
                            <p className="text-[10px] text-slate-400">
                              {item.qty} x Rp {item.unitPrice.toLocaleString("id-ID")}
                            </p>
                            {item.addons && item.addons.length > 0 && (
                              <div className="flex gap-1 pt-0.5">
                                {item.addons.map((a: any, aIdx: number) => (
                                  <span key={aIdx} className="text-[9px] text-red-500 font-bold bg-red-50 px-1.5 py-0.2 rounded uppercase">
                                    +{a.type} (+Rp {a.price.toLocaleString("id-ID")})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-800">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tax & Total calculation */}
                  <div className="border-t border-dashed border-slate-200 pt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>Rp {Math.round(notaData.taxDetails.subtotal).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>PPN ({notaData.taxDetails.ppnRate}%):</span>
                      <span>Rp {Math.round(notaData.taxDetails.ppnAmount).toLocaleString("id-ID")}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm font-extrabold border-t border-slate-100 pt-3">
                      <span className="text-slate-900">Total Pembayaran:</span>
                      <span className="text-red-600 text-lg">
                        Rp {notaData.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Receipt Footer stamp info */}
                  <div className="text-center pt-4 border-t border-dashed border-slate-200">
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-full inline-block border border-emerald-100">
                      PAID / LUNAS (QRIS)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-4 italic">"Terima kasih telah mempercayakan dokumen Anda pada Fotocopy Cakrawala."</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all shadow"
                    >
                      Cetak Nota
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNotaOrder(null);
                        setNotaData(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
                    >
                      Tutup
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-xs text-red-500 font-bold">
                  Gagal memuat data e-nota.
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function Tracking() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
        </div>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
