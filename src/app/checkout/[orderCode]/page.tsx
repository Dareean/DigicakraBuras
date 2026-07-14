"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import gsap from "gsap";
import { AlertTriangle, Clock, Check } from "lucide-react";

interface OrderDetail {
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
    id: number;
    paymentMethod: string;
    qrString: string | null;
    status: string;
    paymentGatewayRef: string | null;
  } | null;
}

export default function CheckoutPayment() {
  const params = useParams();
  const orderCode = params?.orderCode as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);



  // GSAP Column animations when order details load
  useEffect(() => {
    if (!loading && order) {
      gsap.fromTo(".checkout-anim-col",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out" }
      );
    }
  }, [loading, order]);

  // GSAP Elastic checkmark animation when payment status shifts to paid
  useEffect(() => {
    if (order && order.status !== "menunggu_pembayaran" && order.status !== "dibatalkan") {
      gsap.fromTo(".success-checkmark-bounce",
        { scale: 0, rotation: -45 },
        { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)", delay: 0.2 }
      );
    }
  }, [order?.status]);

  const fetchOrderDetails = () => {
    fetch(`/api/orders/${orderCode}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data);
        setLoading(false);
        
        // If order status is pending, generate the QR
        if (data.status === "menunggu_pembayaran" && data.id) {
          generateQRIS(data.id);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (orderCode) {
      fetchOrderDetails();
    }
  }, [orderCode]);

  const generateQRIS = (orderId: number) => {
    fetch(`/api/payments/${orderId}/generate-qr`, { method: "POST" })
      .then((res) => res.json())
      .then((qrData) => {
        if (qrData.qrString) {
          setQrPayload(qrData.qrString);
        }
      })
      .catch((err) => console.error("Error generating QR:", err));
  };

  const simulatePaymentSuccess = async () => {
    if (!order) return;
    setPaying(true);

    try {
      const response = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: order.orderCode,
          status: "success",
          transaction_id: `MOCK-TX-${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh details
        fetchOrderDetails();
      } else {
        alert("Gagal melakukan simulasi pembayaran");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi saat simulasi");
    } finally {
      setPaying(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 text-sm">Memuat informasi pembayaran...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="p-3 bg-red-100 text-red-600 rounded-full mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Pesanan Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Pastikan kode order Anda sudah benar.</p>
          <Link href="/" className="px-5 py-2.5 bg-slate-900 text-white rounded-md text-xs font-semibold">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status !== "menunggu_pembayaran" && order.status !== "dibatalkan";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Order Summary */}
        <div className="checkout-anim-col opacity-0 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Ringkasan Pesanan</span>
              <span className="text-sm font-extrabold text-slate-800">{order.orderCode}</span>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs pb-3 border-b border-slate-50 last:border-b-0 last:pb-0">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">
                      {item.itemType === "atk" ? (item.productName || "ATK Item") : `Jasa Print: ${item.fileUrl}`}
                    </span>
                    {item.itemType === "print_doc" && (
                      <p className="text-slate-400">
                        Spesifikasi: {item.spec.pages} Hal, {item.spec.color === "bw" ? "Hitam Putih" : "Warna"}
                      </p>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {item.addons.map((a, aIdx) => (
                          <span key={aIdx} className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">
                            +{a.addonType} (+Rp {a.price.toLocaleString("id-ID")})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-800 block">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </span>
                    <span className="text-slate-400">x{item.qty}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">Total Biaya</span>
              <span className="text-lg font-extrabold text-red-600">
                Rp {order.totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Customer Details info */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Identitas Pelanggan</h3>
            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Nama:</span>
                <span className="font-semibold text-slate-800">{order.customer?.name || "Walk-in"}</span>
              </div>
              <div className="flex justify-between">
                <span>Nomor WhatsApp:</span>
                <span className="font-semibold text-slate-800">{order.customer?.whatsappNumber || "-"}</span>
              </div>
              {order.pickupNote && (
                <div className="pt-2 border-t border-slate-50">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Catatan:</span>
                  <p className="p-2 bg-slate-50 border border-slate-150 rounded italic text-slate-500">
                    "{order.pickupNote}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: QRIS Payment Box / Success State */}
        <div className="checkout-anim-col opacity-0">
          {!isPaid ? (
            order.payment?.paymentMethod === "manual_qris" && order.payment?.status === "pending" ? (
              /* PENDING VERIFICATION STATE */
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center space-y-6 flex flex-col items-center border-t-4 border-t-amber-500">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-full animate-pulse flex items-center justify-center">
                  <Clock className="w-10 h-10" />
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Menunggu Verifikasi Pembayaran</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Bukti transfer Anda telah terkirim ke kasir. Silakan tunggu antrean verifikasi atau tunjukkan layar ini langsung di kasir toko saat pengambilan.
                  </p>
                </div>

                {order.payment?.paymentGatewayRef && (
                  <div className="border border-slate-200 rounded p-2 bg-slate-50 max-w-[180px] w-full">
                    <span className="text-[9px] text-slate-400 block mb-1 font-bold text-center">Bukti Anda:</span>
                    <img src={order.payment.paymentGatewayRef} className="max-h-28 mx-auto object-contain rounded" alt="Bukti Transfer" />
                  </div>
                )}

                <div className="w-full pt-4 border-t border-slate-100">
                  <button 
                    onClick={fetchOrderDetails} 
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-all"
                  >
                    🔄 Segarkan Status
                  </button>
                </div>
              </div>
            ) : (
              /* PAYMENT SELECTION STATE */
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center space-y-6 flex flex-col items-center">

                {/* DYNAMIC QRIS PANEL */}
                    <div>
                      <span className="text-xs font-bold text-red-650 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-wider">
                        Menunggu Pembayaran
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 mt-3">Pembayaran QRIS</h3>
                      <p className="text-xs text-slate-400 mt-1">Silakan scan kode QRIS di bawah ini</p>
                    </div>

                    {/* QRIS Red Header Frame */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-w-[270px] w-full shadow-md bg-white">
                      <div className="bg-red-600 p-2.5 flex items-center justify-between text-white font-extrabold text-[10px] tracking-widest">
                        <span>QRIS</span>
                        <span className="text-[7px] font-normal leading-none opacity-85">GPN / BANK INDONESIA</span>
                      </div>
                      
                      {/* QR Code Body */}
                      <div className="p-4 flex items-center justify-center bg-white border-b border-slate-100">
                        {qrPayload ? (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`}
                            alt="QRIS QR Code"
                            className="w-48 h-48"
                          />
                        ) : (
                          <div className="w-48 h-48 bg-slate-50 animate-pulse flex items-center justify-center text-xs text-slate-400 rounded">
                            Membuat QRIS...
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 text-[10px] text-slate-700 font-bold text-center">
                        FOTOCOPY CAKRAWALA
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 max-w-xs mx-auto">
                      <p>1. Buka GoPay, OVO, ShopeePay, LinkAja, atau Mobile Banking.</p>
                      <p>2. Arahkan kamera HP ke QR Code di atas.</p>
                      <p>3. Konfirmasi nominal dan klik bayar.</p>
                    </div>

                    {/* Simulation Box for Developers */}
                    <div className="w-full pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Simulasi Integrasi (Developer Tool)</p>
                      <button
                        type="button"
                        onClick={simulatePaymentSuccess}
                        disabled={paying}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all flex items-center justify-center shadow-sm"
                      >
                        {paying ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                            Memverifikasi...
                          </>
                        ) : (
                          "Bayar Sekarang (Simulasi Sukses)"
                        )}
                      </button>
                    </div>
              </div>
            )
          ) : (

            /* SUCCESS STATE */
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center space-y-6 flex flex-col items-center border-t-4 border-t-emerald-500">
              <div className="success-checkmark-bounce p-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800">Pembayaran Sukses!</h3>
                <p className="text-xs text-slate-500 mt-1">Status pesanan Anda sekarang:</p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-extrabold uppercase tracking-wide">
                  {order.status === "diterima" ? "Diterima (Sedang Antre)" : order.status.toUpperCase().replace("_", " ")}
                </span>
              </div>

              {/* Loyalty Stamp Reward feedback */}
              {order.customer && (
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-lg w-full text-xs text-left flex items-center justify-between">
                  <div>
                    <span className="font-bold text-red-950 block">Loyalitas Stempel Digital</span>
                    <p className="text-red-800">Nomor WA {order.customer.whatsappNumber} mendapatkan +1 stempel!</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-red-600 block">{order.customer.totalStamps}</span>
                    <span className="text-[10px] text-slate-400">Total Stempel</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-2">
                <Link
                  href={`/tracking?whatsapp=${order.customer?.whatsappNumber || ""}`}
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all shadow"
                >
                  Lacak Status & Unduh E-Nota
                </Link>
                <Link
                  href="/"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
                >
                  Kembali ke Beranda
                </Link>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
