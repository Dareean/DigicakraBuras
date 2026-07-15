"use client";

/**
 * @file src/app/checkout/[orderCode]/page.tsx
 * @description Halaman checkout untuk pembayaran QRIS via Midtrans.
 *
 * Flow:
 *  1. Fetch detail order dari API
 *  2. Jika status masih "menunggu_pembayaran", generate QR Midtrans
 *  3. Polling status setiap 5 detik sampai pembayaran selesai
 *  4. Tampilkan success state saat order bukan lagi "menunggu_pembayaran"
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import gsap from "gsap";
import { AlertTriangle, Clock, Check, RefreshCw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Interval polling status pembayaran dalam milidetik */
const POLLING_INTERVAL_MS = 5_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderAddon {
  addonType: string;
  price: number;
}

interface OrderItem {
  id: number;
  itemType: string;
  productName: string | null;
  fileUrl: string | null;
  spec: Record<string, unknown>;
  qty: number;
  unitPrice: number;
  subtotal: number;
  addons: OrderAddon[];
}

interface OrderPayment {
  id: number;
  paymentMethod: string;
  qrString: string | null;
  status: string;
  paymentGatewayRef: string | null;
}

interface OrderCustomer {
  name: string;
  whatsappNumber: string;
  totalStamps: number;
}

interface OrderDetail {
  id: number;
  orderCode: string;
  orderSource: string;
  orderType: string;
  status: string;
  totalAmount: number;
  pickupNote: string;
  createdAt: string;
  customer: OrderCustomer | null;
  items: OrderItem[];
  payment: OrderPayment | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Cek apakah order sudah melewati fase "menunggu pembayaran" */
function isOrderPaid(status: string): boolean {
  return status !== "menunggu_pembayaran" && status !== "dibatalkan";
}

/** Format status order menjadi label yang ramah pengguna */
function formatOrderStatus(status: string): string {
  const labels: Record<string, string> = {
    diterima: "Diterima (Sedang Antre)",
    diproses: "Sedang Diproses",
    siap_diambil: "Siap Diambil",
    selesai: "Selesai",
  };
  return labels[status] ?? status.toUpperCase().replace(/_/g, " ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutPayment() {
  const params = useParams();
  const orderCode = params?.orderCode as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref untuk menyimpan polling interval agar bisa di-clear saat component unmount
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── GSAP Animations ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && order) {
      gsap.fromTo(
        ".checkout-anim-col",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out" }
      );
    }
  }, [loading, order]);

  useEffect(() => {
    if (order && isOrderPaid(order.status)) {
      gsap.fromTo(
        ".success-checkmark-bounce",
        { scale: 0, rotation: -45 },
        { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)", delay: 0.2 }
      );
    }
  }, [order?.status]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  /**
   * Fetch detail order dari database lokal kita.
   * Dipanggil saat: (1) initial load, (2) setelah check-status mendeteksi perubahan.
   */
  const fetchOrderDetails = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderCode}`);
      const data: OrderDetail = await res.json();
      setOrder(data);

      // Generate QR jika order masih menunggu pembayaran
      if (data.status === "menunggu_pembayaran" && data.id) {
        await generateQRIS(data.id);
      }

      // Hentikan polling jika pembayaran sudah selesai
      if (isOrderPaid(data.status)) {
        stopPolling();
      }
    } catch (err) {
      console.error("[checkout] Gagal fetch order:", err);
    } finally {
      setLoading(false);
    }
  }, [orderCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateQRIS = async (orderId: number) => {
    try {
      const res = await fetch(`/api/payments/${orderId}/generate-qr`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (err) {
      console.error("[checkout] Gagal generate QRIS:", err);
    }
  };

  // ─── Polling ─────────────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  /**
   * Polling aktif ke Midtrans — tidak perlu webhook/ngrok.
   *
   * Setiap interval, kita query /check-status yang meneruskan request ke
   * Midtrans Get Status API. Jika status berubah (synced=true), baru kita
   * re-fetch detail order dari DB untuk update UI.
   */
  const pollMidtransStatus = useCallback(async () => {
    // Ambil orderId dari state order yang sudah ada
    if (!order?.id || isOrderPaid(order.status)) return;

    try {
      const res = await fetch(`/api/payments/${order.id}/check-status`);
      const data = await res.json();

      // Jika ada perubahan status di Midtrans → sinkronkan UI dengan fetch ulang dari DB
      if (data.synced) {
        await fetchOrderDetails(true);
      }
    } catch (err) {
      console.error("[checkout] Gagal check status Midtrans:", err);
    }
  }, [order?.id, order?.status, fetchOrderDetails]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(
      pollMidtransStatus,
      POLLING_INTERVAL_MS
    );
  }, [pollMidtransStatus]);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Initial fetch
  useEffect(() => {
    if (!orderCode) return;
    fetchOrderDetails();
    return () => stopPolling();
  }, [orderCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mulai polling setelah order pertama kali dimuat
  useEffect(() => {
    if (!order || isOrderPaid(order.status)) return;
    startPolling();
    return () => stopPolling();
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (order?.id) {
      // Cek Midtrans dulu, lalu fetch DB
      const res = await fetch(`/api/payments/${order.id}/check-status`);
      const data = await res.json();
      if (data.synced || true) {
        // Selalu fetch ulang saat manual refresh
        await fetchOrderDetails(true);
      }
    }
    setIsRefreshing(false);
  };

  // ─── Render: Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent mb-4" />
          <p className="text-slate-500 text-sm">Memuat informasi pembayaran...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Order Not Found ──────────────────────────────────────────────────

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="p-3 bg-red-100 text-red-600 rounded-full mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Pesanan Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            Pastikan kode order Anda sudah benar.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-md text-xs font-semibold"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = isOrderPaid(order.status);

  // ─── Render: Main Page ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left Column: Order Summary ──────────────────────────────────── */}
        <div className="checkout-anim-col opacity-0 space-y-6">

          {/* Ringkasan item pesanan */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Ringkasan Pesanan
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {order.orderCode}
              </span>
            </div>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs pb-3 border-b border-slate-50 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">
                      {item.itemType === "atk"
                        ? item.productName ?? "ATK Item"
                        : `Jasa Print: ${item.fileUrl}`}
                    </span>
                    {item.itemType === "print_doc" && (
                      <p className="text-slate-400">
                        Spesifikasi: {String(item.spec.pages)} Hal,{" "}
                        {item.spec.color === "bw" ? "Hitam Putih" : "Warna"}
                      </p>
                    )}
                    {item.addons?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {item.addons.map((addon, aIdx) => (
                          <span
                            key={aIdx}
                            className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase"
                          >
                            +{addon.addonType} (+Rp {addon.price.toLocaleString("id-ID")})
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

            {/* Total */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">Total Biaya</span>
              <span className="text-lg font-extrabold text-red-600">
                Rp {order.totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Identitas pelanggan */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Identitas Pelanggan
            </h3>
            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Nama:</span>
                <span className="font-semibold text-slate-800">
                  {order.customer?.name || "Walk-in"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nomor WhatsApp:</span>
                <span className="font-semibold text-slate-800">
                  {order.customer?.whatsappNumber || "-"}
                </span>
              </div>
              {order.pickupNote && (
                <div className="pt-2 border-t border-slate-50">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Catatan:
                  </span>
                  <p className="p-2 bg-slate-50 border border-slate-150 rounded italic text-slate-500">
                    &ldquo;{order.pickupNote}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Payment State ─────────────────────────────────── */}
        <div className="checkout-anim-col opacity-0">
          {isPaid ? (
            <SuccessState order={order} />
          ) : (
            <QrisPaymentState
              order={order}
              qrCodeUrl={qrCodeUrl}
              isRefreshing={isRefreshing}
              onManualRefresh={handleManualRefresh}
            />
          )}
        </div>

      </main>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * Tampilan panel QRIS saat menunggu pembayaran.
 */
function QrisPaymentState({
  order,
  qrCodeUrl,
  isRefreshing,
  onManualRefresh,
}: {
  order: OrderDetail;
  qrCodeUrl: string | null;
  isRefreshing: boolean;
  onManualRefresh: () => void;
}) {
  return (
    <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center space-y-6 flex flex-col items-center">

      <div>
        <span className="text-xs font-bold text-red-650 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-wider">
          Menunggu Pembayaran
        </span>
        <h3 className="text-lg font-bold text-slate-800 mt-3">Pembayaran QRIS</h3>
        <p className="text-xs text-slate-400 mt-1">
          Silakan scan kode QRIS di bawah ini
        </p>
      </div>

      {/* Frame QRIS */}
      <div className="border border-slate-200 rounded-lg overflow-hidden max-w-[270px] w-full shadow-md bg-white">
        {/* Header merah QRIS */}
        <div className="bg-red-600 p-2.5 flex items-center justify-between text-white font-extrabold text-[10px] tracking-widest">
          <span>QRIS</span>
          <span className="text-[7px] font-normal leading-none opacity-85">
            GPN / BANK INDONESIA
          </span>
        </div>

        {/* QR Code Image */}
        <div className="p-4 flex items-center justify-center bg-white border-b border-slate-100 min-h-[208px]">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QRIS QR Code"
              className="w-48 h-48 object-contain"
            />
          ) : (
            <div className="w-48 h-48 bg-slate-50 animate-pulse flex items-center justify-center rounded">
              <span className="text-xs text-slate-400">Membuat QRIS...</span>
            </div>
          )}
        </div>

        {/* Nama Merchant */}
        <div className="p-3 bg-slate-50 text-[10px] text-slate-700 font-bold text-center uppercase tracking-wide">
          Fotocopy Cakrawala
        </div>
      </div>

      {/* Instruksi */}
      <ol className="text-xs text-slate-500 space-y-1 max-w-xs mx-auto text-left list-decimal list-inside">
        <li>Buka GoPay, OVO, ShopeePay, LinkAja, atau Mobile Banking.</li>
        <li>Arahkan kamera HP ke QR Code di atas.</li>
        <li>Konfirmasi nominal dan klik bayar.</li>
      </ol>

      {/* Info polling otomatis + tombol refresh manual */}
      <div className="w-full pt-4 border-t border-slate-100 space-y-2">
        <p className="text-[10px] text-slate-400 text-center">
          Status diperbarui otomatis setiap 5 detik
        </p>
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Memeriksa..." : "Segarkan Status"}
        </button>
      </div>
    </div>
  );
}

/**
 * Tampilan sukses setelah pembayaran terkonfirmasi.
 */
function SuccessState({ order }: { order: OrderDetail }) {
  return (
    <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center space-y-6 flex flex-col items-center border-t-4 border-t-emerald-500">

      <div className="success-checkmark-bounce p-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
        <Check className="w-10 h-10" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-800">Pembayaran Sukses!</h3>
        <p className="text-xs text-slate-500 mt-1">Status pesanan Anda sekarang:</p>
        <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-extrabold uppercase tracking-wide">
          {formatOrderStatus(order.status)}
        </span>
      </div>

      {/* Loyalty Stamp Reward */}
      {order.customer && (
        <div className="bg-red-50/50 border border-red-100 p-4 rounded-lg w-full text-xs text-left flex items-center justify-between">
          <div>
            <span className="font-bold text-red-950 block">Loyalitas Stempel Digital</span>
            <p className="text-red-800">
              Nomor WA {order.customer.whatsappNumber} mendapatkan +1 stempel!
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold text-red-600 block">
              {order.customer.totalStamps}
            </span>
            <span className="text-[10px] text-slate-400">Total Stempel</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full space-y-2 pt-2">
        <Link
          href={`/tracking?whatsapp=${order.customer?.whatsappNumber ?? ""}`}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all shadow"
        >
          Lacak Status &amp; Unduh E-Nota
        </Link>
        <Link
          href="/"
          className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

