"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";

interface Product {
  id: number;
  name: string;
  price: number;
  stockQty: number;
  category: string;
}

interface PosItem {
  id: string; // unique POS temporary ID
  itemType: "atk" | "print_doc";
  productId?: number;
  name: string;
  qty: number;
  unitPrice: number;
  spec?: any;
  addons?: Array<{ addonType: string; price: number }>;
}

export default function AdminPos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  // Custom Print input states
  const [printPages, setPrintPages] = useState(1);
  const [printColor, setPrintColor] = useState<"bw" | "color">("bw");
  const [printQty, setPrintQty] = useState(1);
  const [printJilid, setPrintJilid] = useState(false);
  const [printLaminating, setPrintLaminating] = useState(false);

  // Checkout states
  const [posCart, setPosCart] = useState<PosItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // QRIS modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(null);
  const [verifyingQr, setVerifyingQr] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "Semua" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.stockQty > 0;
  });

  // Cart operations
  const addProductToCart = (p: Product) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.productId === p.id && item.itemType === "atk");
      if (existing) {
        if (existing.qty >= p.stockQty) {
          alert("Stok barang tidak mencukupi!");
          return prev;
        }
        return prev.map((item) =>
          item.productId === p.id && item.itemType === "atk"
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: `atk-${p.id}`,
            itemType: "atk",
            productId: p.id,
            name: p.name,
            qty: 1,
            unitPrice: p.price,
          },
        ];
      }
    });
  };

  const addCustomPrintToCart = () => {
    const unitPrice = printColor === "bw" ? 500 : 1500;
    const addons = [];
    if (printJilid) addons.push({ addonType: "jilid", price: 5000 });
    if (printLaminating) addons.push({ addonType: "laminating", price: 4000 });

    const printItem: PosItem = {
      id: `print-${Date.now()}`,
      itemType: "print_doc",
      name: `Cetak File (${printColor === "bw" ? "B/W" : "Warna"}, ${printPages} hal)`,
      qty: printQty,
      unitPrice: unitPrice,
      spec: {
        pages: printPages,
        color: printColor,
      },
      addons,
    };

    setPosCart((prev) => [...prev, printItem]);
    
    // Reset states
    setPrintPages(1);
    setPrintColor("bw");
    setPrintQty(1);
    setPrintJilid(false);
    setPrintLaminating(false);
  };

  const updateCartQty = (id: string, delta: number) => {
    setPosCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      
      const nextQty = item.qty + delta;
      if (nextQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }

      // Check stock for ATK products
      if (item.itemType === "atk" && item.productId) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && nextQty > prod.stockQty) {
          alert("Stok barang tidak mencukupi!");
          return prev;
        }
      }

      return prev.map((i) => (i.id === id ? { ...i, qty: nextQty } : i));
    });
  };

  const getCartItemTotal = (item: PosItem) => {
    const addonsPrice = item.addons ? item.addons.reduce((sum, a) => sum + a.price, 0) : 0;
    return (item.unitPrice * item.qty) + addonsPrice;
  };

  const getCartTotal = () => {
    return posCart.reduce((sum, item) => sum + getCartItemTotal(item), 0);
  };

  // Submit POS checkout
  const handleCheckout = async () => {
    if (posCart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    setCheckoutLoading(true);

    const items = posCart.map((item) => {
      const addons = item.addons?.map((ad) => ({
        addonType: ad.addonType,
        price: ad.price,
      }));

      return {
        itemType: item.itemType,
        productId: item.productId || null,
        qty: item.qty,
        unitPrice: item.unitPrice,
        specJson: item.spec || {},
        addons,
      };
    });

    const hasPrint = posCart.some((i) => i.itemType === "print_doc");
    const hasAtk = posCart.some((i) => i.itemType === "atk");
    const orderType = hasPrint && hasAtk ? "mixed" : hasPrint ? "print" : "atk";

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: customerWa || null,
          customerName: customerName || null,
          orderSource: "pos",
          orderType,
          pickupNote: "Walk-in POS checkout",
          items,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (paymentMethod === "qris") {
          // Open QRIS Modal
          setActiveOrderCode(data.orderCode);
          fetchQrDetails(data.orderId);
        } else {
          // Cash success: Clear cart and show notification
          alert(`Transaksi Tunai Sukses!\nKode: ${data.orderCode}\nTotal: Rp ${data.totalAmount.toLocaleString("id-ID")}`);
          resetPOS();
        }
      } else {
        alert(data.error || "Gagal memproses transaksi kasir");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const fetchQrDetails = (orderId: number) => {
    fetch(`/api/payments/${orderId}/generate-qr`, { method: "POST" })
      .then((res) => res.json())
      .then((qrData) => {
        if (qrData.qrString) {
          setQrCodeString(qrData.qrString);
          setShowQrModal(true);
        }
      })
      .catch((err) => console.error(err));
  };

  const verifyQrisPayment = async () => {
    if (!activeOrderCode) return;
    setVerifyingQr(true);

    try {
      const response = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: activeOrderCode,
          status: "success",
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Pembayaran QRIS Sukses Diverifikasi!");
        setShowQrModal(false);
        resetPOS();
      } else {
        alert("Menunggu pembayaran dari pelanggan...");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan pengecekan");
    } finally {
      setVerifyingQr(false);
    }
  };

  const resetPOS = () => {
    setPosCart([]);
    setCustomerName("");
    setCustomerWa("");
    setPaymentMethod("cash");
    setQrCodeString(null);
    setActiveOrderCode(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Kasir Toko (POS)</h1>
          <p className="text-slate-500 text-xs mt-0.5">Input transaksi pelanggan langsung (walk-in) dan pilih metode pembayaran.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Area: Catalog & Jasa Print Form (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Custom Print Job Form */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layanan Jasa Print / Fotokopi</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Hal</label>
                  <input
                    type="number"
                    min="1"
                    value={printPages}
                    onChange={(e) => setPrintPages(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 h-9 border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Warna</label>
                  <select
                    value={printColor}
                    onChange={(e) => setPrintColor(e.target.value as any)}
                    className="w-full px-3 h-9 border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium bg-white"
                  >
                    <option value="bw">Hitam Putih (Rp500)</option>
                    <option value="color">Warna (Rp1500)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={printQty}
                    onChange={(e) => setPrintQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 h-9 border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium bg-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addCustomPrintToCart}
                    className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold shadow-sm transition-all"
                  >
                    + Tambah Jasa
                  </button>
                </div>
              </div>

              {/* Addons for custom print */}
              <div className="flex flex-wrap gap-4 pt-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printJilid}
                    onChange={(e) => setPrintJilid(e.target.checked)}
                    className="rounded border-slate-350 text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-700">Add-on Jilid (+Rp5.000)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printLaminating}
                    onChange={(e) => setPrintLaminating(e.target.checked)}
                    className="rounded border-slate-350 text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-700">Add-on Laminating (+Rp4.000)</span>
                </label>
              </div>
            </div>

            {/* ATK Products List */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Katalog Produk ATK</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cari ATK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 w-full sm:w-40 font-medium"
                  />
                  <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent mb-2"></div>
                  <p className="text-slate-500 text-xs">Memuat katalog...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-6">Katalog kosong atau stok habis.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addProductToCart(p)}
                      className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-red-500 hover:bg-red-50/5 transition-all text-xs bg-slate-50/20"
                    >
                      <span className="text-[9px] font-bold text-red-600 uppercase block">{p.category}</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">{p.name}</span>
                      <div className="flex justify-between items-baseline mt-3">
                        <span className="font-extrabold text-slate-900">
                          Rp {p.price.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-slate-400">Stok: {p.stockQty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Area: POS Cart Checkout (5 columns) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaksi Aktif</h2>

            {/* Cart Items list */}
            {posCart.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs border border-slate-100 rounded bg-slate-50/50">
                Keranjang POS kosong. Silakan tambahkan ATK atau jasa print.
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {posCart.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[10px] text-red-500 font-bold">
                          + Add-on: {item.addons.map((a) => a.addonType).join(", ")}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.qty} x Rp {item.unitPrice.toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="text-right space-y-1.5">
                      <span className="font-extrabold text-slate-950 block">
                        Rp {getCartItemTotal(item).toLocaleString("id-ID")}
                      </span>
                      <div className="flex items-center space-x-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-0.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-500"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="p-0.5 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-500"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer metadata inputs */}
            <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Pelanggan (Loyalitas)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890 (Opsional)"
                  value={customerWa}
                  onChange={(e) => setCustomerWa(e.target.value)}
                  className="w-full px-3 h-9 border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Nama Lengkap (Opsional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 h-9 border border-slate-200 rounded text-xs focus:outline-none focus:border-red-500 font-medium bg-white"
                />
              </div>
            </div>

            {/* Payment method selector */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`py-2 rounded font-bold border transition-all text-center ${
                    paymentMethod === "cash"
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-350"
                  }`}
                >
                  Tunai / Manual
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("qris")}
                  className={`py-2 rounded font-bold border transition-all text-center ${
                    paymentMethod === "qris"
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-350"
                  }`}
                >
                  QRIS Dinamis
                </button>
              </div>
            </div>

            {/* Checkout total & button */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Total Belanja:</span>
                <span className="text-xl font-extrabold text-red-600">
                  Rp {getCartTotal().toLocaleString("id-ID")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || posCart.length === 0}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded shadow-md transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
              >
                {checkoutLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  paymentMethod === "cash" ? "Proses & Cetak Nota Tunai" : "Generate QRIS Kasir"
                )}
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* QRIS Modal for POS */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center space-y-6 border-t-8 border-t-red-600">
            <div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest">
                QRIS POS AKTIF
              </span>
              <h3 className="text-sm font-bold text-slate-800 mt-2">Menunggu Pembayaran QRIS Pelanggan</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Tunjukkan kode QR di bawah ini pada pelanggan</p>
            </div>

            {/* QR Frame */}
            <div className="border border-slate-150 rounded-lg overflow-hidden max-w-[220px] mx-auto bg-white">
              <div className="bg-red-600 p-2 text-white font-extrabold text-[8px] tracking-wider flex justify-between">
                <span>QRIS</span>
                <span>BI / GPN</span>
              </div>
              <div className="p-3 bg-white border-b border-slate-50 flex items-center justify-center">
                {qrCodeString ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeString)}`}
                    alt="POS QRIS"
                    className="w-40 h-40"
                  />
                ) : (
                  <div className="w-40 h-40 bg-slate-100 animate-pulse flex items-center justify-center text-[10px] text-slate-400">
                    Memuat QRIS...
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-2 text-[9px] font-bold text-slate-600">
                FOTOCOPY CAKRAWALA
              </div>
            </div>

            <div className="text-xs font-bold text-slate-850">
              Total Pembayaran: <span className="text-red-600 text-sm font-extrabold">Rp {getCartTotal().toLocaleString("id-ID")}</span>
            </div>

            {/* Action check buttons */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={verifyQrisPayment}
                disabled={verifyingQr}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow transition-all flex items-center justify-center"
              >
                {verifyingQr ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2"></div>
                    Mengecek Status...
                  </>
                ) : (
                  "Cek Status Pembayaran (Simulasi Sukses)"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  resetPOS();
                }}
                className="w-full py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded text-xs font-bold transition-all"
              >
                Batalkan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
