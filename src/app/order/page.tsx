"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";

interface CartItem {
  itemType: string;
  productId: number;
  qty: number;
  unitPrice: number;
  name: string;
}

export default function OrderConfig() {
  // Customer identity
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mockFileName, setMockFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print options
  const [pages, setPages] = useState<number>(1);
  const [colorType, setColorType] = useState<"bw" | "color">("bw"); // bw = Hitam Putih, color = Warna

  // Addons (only editable if file is uploaded)
  const [hasJilid, setHasJilid] = useState(false);
  const [hasLaminating, setHasLaminating] = useState(false);

  // ATK Cart items loaded from landing page
  const [atkItems, setAtkItems] = useState<CartItem[]>([]);
  const [pickupNote, setPickupNote] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load ATK items if any
    const stored = localStorage.getItem("atk_cart");
    if (stored) {
      try {
        setAtkItems(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMockFileName("");
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Mock file for quick testing without actual upload
  const setMockFile = () => {
    setMockFileName("dokumen_skripsi_final.pdf");
    setSelectedFile(null);
  };

  // Calculate prices
  const getPrintUnitPrice = () => {
    return colorType === "bw" ? 500 : 1500; // Rp 500 for BW, Rp 1500 for Color
  };

  const getPrintAddonsTotal = () => {
    let sum = 0;
    if (hasJilid) sum += 5000;
    if (hasLaminating) sum += 4000;
    return sum;
  };

  const getPrintSubtotal = () => {
    const isFileUploaded = !!selectedFile || !!mockFileName;
    if (!isFileUploaded) return 0;
    return (getPrintUnitPrice() * pages) + getPrintAddonsTotal();
  };

  const getAtkTotal = () => {
    return atkItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
  };

  const getTotalAmount = () => {
    return getPrintSubtotal() + getAtkTotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert("Nama Lengkap wajib diisi!");
      return;
    }

    if (!whatsapp.trim() || whatsapp.length < 9) {
      alert("Nomor WhatsApp tidak valid!");
      return;
    }

    const hasFile = !!selectedFile || !!mockFileName;
    const hasAtk = atkItems.length > 0;

    if (!hasFile && !hasAtk) {
      alert("Pilih berkas untuk dicetak atau belanja ATK terlebih dahulu!");
      return;
    }

    setLoading(true);

    // Prepare order data
    const orderItems: any[] = [];

    if (hasFile) {
      const addons = [];
      if (hasJilid) addons.push({ addonType: "jilid", price: 5000 });
      if (hasLaminating) addons.push({ addonType: "laminating", price: 4000 });

      orderItems.push({
        itemType: "print_doc",
        productId: null,
        qty: 1,
        unitPrice: getPrintUnitPrice(),
        fileUrl: mockFileName || selectedFile?.name || "dokumen_upload.pdf",
        specJson: {
          pages: pages,
          color: colorType,
          fileName: mockFileName || selectedFile?.name,
        },
        addons,
      });
    }

    if (hasAtk) {
      atkItems.forEach((item) => {
        orderItems.push({
          itemType: "atk",
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
        });
      });
    }

    const orderType = hasFile && hasAtk ? "mixed" : hasFile ? "print" : "atk";

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsapp,
          customerName: fullName,
          orderSource: "online",
          orderType,
          pickupNote: pickupNote,
          items: orderItems,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear local storage cart
        localStorage.removeItem("atk_cart");
        // Redirect to checkout payment
        window.location.href = `/checkout/${data.orderCode}`;
      } else {
        alert(data.error || "Gagal memproses pesanan");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Konfigurasi Pesanan</h1>
          <p className="text-slate-500 text-sm mt-1">Lengkapi detail pesanan Anda untuk proses yang lebih cepat.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          {/* Identitas Pelanggan */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Identitas Pelanggan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
                  required
                />
              </div>
            </div>
          </section>

          {/* Unggah Berkas */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Unggah Berkas</h2>
            
            <div 
              onClick={triggerFileSelect}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-all hover:border-red-300"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,image/*"
                className="hidden"
              />
              
              <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <p className="text-sm font-bold text-slate-800">Tarik & Lepas berkas di sini</p>
              <p className="text-xs text-slate-400 mt-1">Mendukung format PDF, DOCX, atau Gambar</p>
              
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
              >
                Pilih Berkas
              </button>
            </div>

            {/* Mock Selection helper */}
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={setMockFile}
                className="text-xs text-red-600 font-semibold hover:underline"
              >
                *Gunakan Berkas Contoh (Cepat)
              </button>
            </div>

            {/* Display Selected File Details */}
            {(selectedFile || mockFileName) && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate max-w-[300px]">
                      {selectedFile ? selectedFile.name : mockFileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "1.2 MB"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setMockFileName("");
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </section>

          {/* Opsi Cetak */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Opsi Cetak</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah Halaman
                </label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, Number(e.target.value)))}
                  className="w-full px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white font-medium"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Warna Cetak
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-md h-11">
                  <button
                    type="button"
                    onClick={() => setColorType("bw")}
                    className={`py-1.5 text-xs font-bold rounded text-center transition-all ${
                      colorType === "bw"
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Hitam Putih
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorType("color")}
                    className={`py-1.5 text-xs font-bold rounded text-center transition-all ${
                      colorType === "color"
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Warna
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Addons - only shown/active when file is selected */}
            {(selectedFile || mockFileName) && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-150 space-y-3">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Add-on Tambahan (Jilid & Laminating)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-slate-300">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hasJilid}
                        onChange={(e) => setHasJilid(e.target.checked)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-800">Jilid Dokumen</span>
                    </div>
                    <span className="text-xs font-extrabold text-red-600">+ Rp 5.000</span>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-slate-300">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hasLaminating}
                        onChange={(e) => setHasLaminating(e.target.checked)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-800">Laminating</span>
                    </div>
                    <span className="text-xs font-extrabold text-red-600">+ Rp 4.000</span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* ATK Items Summary (If any) */}
          {atkItems.length > 0 && (
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="text-lg font-bold text-slate-800">ATK yang Dipesan</h2>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("atk_cart");
                    setAtkItems([]);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus ATK
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-150">
                {atkItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <p className="text-slate-400">Qty: {item.qty} x Rp {item.unitPrice.toLocaleString("id-ID")}</p>
                    </div>
                    <span className="font-extrabold text-slate-800">
                      Rp {(item.unitPrice * item.qty).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Catatan Pengambilan / Pesanan (Opsional)
            </label>
            <textarea
              placeholder="Contoh: Tolong cetak bolak-balik, atau info jam pengambilan"
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white h-20 resize-none"
            />
          </section>

          {/* Price Summary */}
          <section className="bg-red-50 border border-red-100 p-6 rounded-lg space-y-3">
            <h3 className="font-bold text-red-950 text-sm">Rincian Estimasi Biaya</h3>
            
            <div className="space-y-1.5 text-xs text-red-900 border-b border-red-200/50 pb-3">
              {((selectedFile || mockFileName)) && (
                <div className="flex justify-between">
                  <span>Cetak Jasa ({pages} hal x Rp {getPrintUnitPrice().toLocaleString("id-ID")}):</span>
                  <span>Rp {(getPrintUnitPrice() * pages).toLocaleString("id-ID")}</span>
                </div>
              )}

              {hasJilid && (
                <div className="flex justify-between">
                  <span>Add-on Jilid:</span>
                  <span>Rp 5.000</span>
                </div>
              )}

              {hasLaminating && (
                <div className="flex justify-between">
                  <span>Add-on Laminating:</span>
                  <span>Rp 4.000</span>
                </div>
              )}

              {atkItems.length > 0 && (
                <div className="flex justify-between">
                  <span>Belanja ATK:</span>
                  <span>Rp {getAtkTotal().toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-red-950">Total Pembayaran:</span>
              <span className="text-xl font-extrabold text-red-600">
                Rp {getTotalAmount().toLocaleString("id-ID")}
              </span>
            </div>
          </section>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3.5 px-4 rounded-md font-bold hover:bg-red-700 shadow-md hover:shadow-red-700/20 active:bg-red-800 transition-all flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Memproses Pesanan...
              </>
            ) : (
              "Lanjut ke Checkout"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
