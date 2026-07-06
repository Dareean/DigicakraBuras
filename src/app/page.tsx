"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQty: number;
  category: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [cart, setCart] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = products;
    
    if (activeCategory !== "Semua") {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (search.trim() !== "") {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredProducts(result);
  }, [search, activeCategory, products]);

  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const updateCart = (productId: number, change: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + change;
      
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      
      if (next > product.stockQty) {
        alert(`Stok tidak mencukupi. Maksimal stok tersedia: ${product.stockQty}`);
        return prev;
      }

      return { ...prev, [productId]: next };
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = products.find((p) => p.id === Number(id));
      return sum + (product ? product.price * qty : 0);
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  // Build ordering params for ATK checkout
  const getAtkOrderUrl = () => {
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = products.find((prod) => prod.id === Number(id))!;
      return {
        itemType: "atk",
        productId: p.id,
        qty: qty,
        unitPrice: p.price,
        name: p.name,
      };
    });
    
    // Save to localStorage and redirect to order config
    if (typeof window !== "undefined") {
      localStorage.setItem("atk_cart", JSON.stringify(items));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.15),transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400 ring-1 ring-inset ring-red-500/20 mb-4 animate-pulse">
            Inovasi Digital Pembayaran BRIDA 2026
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Solusi Satu Pintu Fotokopi & ATK Cakrawala
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Upload file Anda dari rumah, bayar dengan QRIS secara instan, lacak status secara real-time, dan ambil pesanan Anda saat sudah siap!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/order"
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 text-base font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-all shadow-lg hover:shadow-red-900/30"
            >
              Cetak Dokumen Online
            </Link>
            <a
              href="#katalog"
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 text-base font-semibold text-white bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-all shadow-md"
            >
              Belanja ATK Toko
            </a>
          </div>
        </div>
      </section>

      {/* Cara Kerja Section */}
      <section id="cara-kerja" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Cara Kerja DIGICAKRA</h2>
          <p className="text-slate-600 mt-2">Pemesanan dokumen Anda menjadi sangat mudah dengan 4 langkah praktis</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              step: "01",
              title: "Konfigurasi & Upload",
              desc: "Isi nama & WA, unggah file PDF/DOCX/Gambar, dan pilih spesifikasi warna/jilid.",
            },
            {
              step: "02",
              title: "Bayar QRIS Instan",
              desc: "Scan kode QRIS dinamis di layar HP Anda menggunakan aplikasi bank/e-wallet pilihan.",
            },
            {
              step: "03",
              title: "Kami Proses Segera",
              desc: "Staf kami langsung memproses dokumen/pesanan Anda sesuai antrean.",
            },
            {
              step: "04",
              title: "Lacak & Ambil",
              desc: "Pantau status pesanan lewat nomor WhatsApp. Ambil di toko tanpa perlu mengantre.",
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm relative group hover:border-red-300 transition-all">
              <span className="text-4xl font-extrabold text-red-100 group-hover:text-red-200 transition-all block mb-4">
                {item.step}
              </span>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promo & Loyalty Program Banner */}
      <section id="promo" className="py-8 bg-red-50 border-y border-red-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 text-white rounded-full">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm-2 4h10M4 18c0-1.1.9-2 2-2h12a2 2 0 012 2M4 18v-4a2 2 0 012-2h12a2 2 0 012 2v4M4 18H3a1 1 0 01-1-1v-2a1 1 0 011-1h1M19 18h1a1 1 0 001-1v-2a1 1 0 00-1-1h-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-950">Program Loyalitas Stempel Digital!</h3>
              <p className="text-sm text-red-800">Kumpulkan stempel digital dengan memesan produk lewat WhatsApp. Dapatkan reward potongan harga menarik setiap kelipatan 10 stempel!</p>
            </div>
          </div>
          <Link
            href="/tracking"
            className="w-full md:w-auto inline-flex justify-center items-center px-6 py-2.5 text-sm font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-all border border-red-200"
          >
            Cek Stempel Saya
          </Link>
        </div>
      </section>

      {/* Katalog ATK Section */}
      <section id="katalog" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Katalog Alat Tulis Kantor</h2>
          <p className="text-slate-600 mt-2">Daftar perlengkapan ATK berkualitas yang tersedia langsung di toko kami</p>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                  activeCategory === cat
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari ATK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 px-4 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-red-600 transition-all"
            />
          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500">Memuat produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">Tidak ada produk yang cocok dengan pencarian Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const qtyInCart = cart[p.id] || 0;
              return (
                <div key={p.id} className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md transition-all">
                  <div className="p-6">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600 block mb-1">
                      {p.category}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base mb-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">{p.description}</p>
                    
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-lg font-extrabold text-slate-900">
                        Rp {p.price.toLocaleString("id-ID")}
                      </span>
                      <span className={`text-xs ${p.stockQty > 5 ? "text-slate-400" : "text-amber-600 font-bold"}`}>
                        Stok: {p.stockQty}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-0 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between h-16">
                    {qtyInCart === 0 ? (
                      <button
                        onClick={() => updateCart(p.id, 1)}
                        disabled={p.stockQty === 0}
                        className={`w-full py-2 px-3 text-xs font-semibold text-center rounded-md border transition-all ${
                          p.stockQty === 0
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {p.stockQty === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => updateCart(p.id, -1)}
                          className="p-1 text-slate-500 border border-slate-300 rounded hover:bg-white"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-sm font-bold text-slate-800">{qtyInCart}</span>
                        <button
                          onClick={() => updateCart(p.id, 1)}
                          className="p-1 text-slate-500 border border-slate-300 rounded hover:bg-white"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Cart for ATK */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-6 right-6 z-40 bg-white border border-slate-200 rounded-lg shadow-xl p-4 w-80 animate-fade-in border-t-4 border-t-red-600">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-800">Keranjang Belanja ({getCartCount()})</span>
            <button onClick={() => setCart({})} className="text-xs text-red-500 hover:underline">
              Kosongkan
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto mb-3 space-y-2 pr-1">
            {Object.entries(cart).map(([id, qty]) => {
              const p = products.find((prod) => prod.id === Number(id));
              if (!p) return null;
              return (
                <div key={id} className="flex justify-between text-xs text-slate-600">
                  <span className="truncate max-w-[160px]">{p.name}</span>
                  <span className="font-semibold">{qty} x Rp {p.price.toLocaleString("id-ID")}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between items-center mb-4">
            <span className="text-xs text-slate-500">Total Harga:</span>
            <span className="text-base font-extrabold text-red-600">
              Rp {getCartTotal().toLocaleString("id-ID")}
            </span>
          </div>
          <button
            onClick={() => {
              getAtkOrderUrl();
              window.location.href = "/order";
            }}
            className="w-full py-2.5 px-4 bg-red-600 text-white text-xs font-bold text-center rounded-md hover:bg-red-700 transition-all shadow-md"
          >
            Checkout & Ambil Toko
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-16 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">DIGICAKRA</h3>
            <p className="text-sm leading-relaxed">
              Platform layanan digital terintegrasi untuk Fotocopy Cakrawala. Memberikan kemudahan pemesanan cetak dan belanja ATK berbasis QRIS.
            </p>
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold mb-4">Link Cepat</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/order" className="hover:text-white transition-colors">Cetak Dokumen</Link>
              </li>
              <li>
                <a href="#katalog" className="hover:text-white transition-colors">Belanja ATK</a>
              </li>
              <li>
                <Link href="/tracking" className="hover:text-white transition-colors">Lacak Pesanan</Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">Dashboard Admin (Kasir)</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold mb-4">Lokasi & Kontak</h3>
            <ul className="space-y-2 text-sm">
              <li>Kota Palu, Sulawesi Tengah</li>
              <li>WhatsApp: +62 812-3456-7890</li>
              <li>Email: info@cakrawala.id</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800 mt-8 pt-8 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} DIGICAKRA — Fotocopy Cakrawala. Universitas Tadulako, BRIDA Sulteng 2026.</p>
        </div>
      </footer>
    </div>
  );
}
