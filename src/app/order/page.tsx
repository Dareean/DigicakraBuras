"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import gsap from "gsap";

interface CartItem {
  itemType: string;
  productId: number;
  qty: number;
  unitPrice: number;
  name: string;
}

const getPdfPageCount = async (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const arr = new Uint8Array(e.target?.result as ArrayBuffer);
        const text = new TextDecoder("ascii").decode(arr);
        const matches = text.match(/\/Count\s+(\d+)/g);
        if (matches) {
          const lastMatch = matches[matches.length - 1];
          const match = lastMatch.match(/\d+/);
          if (match) {
            resolve(parseInt(match[0], 10));
            return;
          }
        }
        const pageTypeMatches = text.match(/\/Type\s*\/Page\b/g);
        if (pageTypeMatches) {
          resolve(pageTypeMatches.length);
          return;
        }
        resolve(1);
      } catch (err) {
        resolve(1);
      }
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file);
  });
};

const renderPdfThumbnails = async (file: File, maxPages = 16): Promise<string[]> => {
  try {
    const pdfjsLib = await new Promise<any>((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        resolve(pdfjs);
      };
      script.onerror = () => reject("Failed to load PDF.js");
      document.head.appendChild(script);
    });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = Math.min(pdf.numPages, maxPages);
    const previews: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.18 }); // thumbnail scale
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        previews.push(canvas.toDataURL());
      } else {
        previews.push("");
      }
    }
    return previews;
  } catch (err) {
    console.error("Error generating thumbnails:", err);
    return [];
  }
};

export default function OrderConfig() {
  // Customer identity
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mockFileName, setMockFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated PDF details
  const [originalTotalPages, setOriginalTotalPages] = useState<number>(0);
  const [excludedPages, setExcludedPages] = useState<number[]>([]);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [hoveredPage, setHoveredPage] = useState<number>(1);

  // Load GSAP animations on mount
  useEffect(() => {
    gsap.fromTo(".form-section-anim", 
      { opacity: 0, y: 25 }, 
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
    );
  }, []);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setMockFileName("");
      setExcludedPages([]);
      setPagePreviews([]);
      setHoveredPage(1);
      
      if (file.type === "application/pdf") {
        setLoading(true);
        const count = await getPdfPageCount(file);
        setOriginalTotalPages(count);
        setPages(count);
        
        try {
          const previews = await renderPdfThumbnails(file);
          setPagePreviews(previews);
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      } else {
        setOriginalTotalPages(1);
        setPages(1);
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Mock file for quick testing without actual upload
  const setMockFile = () => {
    setMockFileName("dokumen_skripsi_final.pdf");
    setSelectedFile(null);
    setExcludedPages([]);
    setPagePreviews([]);
    setHoveredPage(1);
    setOriginalTotalPages(8); // Mock skripsi as 8 pages
    setPages(8);
  };

  const togglePageSelection = (pageNum: number) => {
    setExcludedPages((prev) => {
      let next;
      if (prev.includes(pageNum)) {
        next = prev.filter((p) => p !== pageNum);
      } else {
        next = [...prev, pageNum];
      }
      
      // Ensure they don't exclude ALL pages (print at least 1)
      if (next.length === originalTotalPages) {
        alert("Anda harus mencetak minimal 1 halaman!");
        return prev;
      }
      
      setPages(originalTotalPages - next.length);
      return next;
    });
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

      const printedPages = Array.from({ length: originalTotalPages })
        .map((_, i) => i + 1)
        .filter((p) => !excludedPages.includes(p));

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
          printedPages: printedPages.length > 0 ? printedPages : [1],
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
        <div className="form-section-anim opacity-0 mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Konfigurasi Pesanan</h1>
          <p className="text-slate-500 text-sm mt-1">Lengkapi detail pesanan Anda untuk proses yang lebih cepat.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          {/* Identitas Pelanggan */}
          <section className="form-section-anim opacity-0 space-y-4">
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
          <section className="form-section-anim opacity-0 space-y-4">
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
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[240px] sm:max-w-[300px]">
                        {selectedFile ? selectedFile.name : mockFileName}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "1.2 MB"}
                        {originalTotalPages > 0 && ` • Total: ${originalTotalPages} halaman`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setMockFileName("");
                      setOriginalTotalPages(0);
                      setExcludedPages([]);
                      setPages(1);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Visual Page Excluder */}
                {originalTotalPages > 1 && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Pilih Halaman yang Dicetak</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Klik halaman untuk mengecualikan dari cetakan. Arahkan kursor untuk pratinjau besar.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                      
                      {/* Left: Thumbnail Grid */}
                      <div className="md:col-span-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {Array.from({ length: originalTotalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isIncluded = !excludedPages.includes(pageNum);
                          const previewImg = pagePreviews[idx];
                          
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => togglePageSelection(pageNum)}
                              onMouseEnter={() => setHoveredPage(pageNum)}
                              className={`flex flex-col items-center justify-between p-2 h-32 border rounded-md transition-all relative overflow-hidden group ${
                                isIncluded
                                  ? "bg-white border-red-500 shadow-sm ring-1 ring-red-400"
                                  : "bg-slate-50 border-slate-200 opacity-60"
                              }`}
                            >
                              {/* Header */}
                              <div className="w-full flex justify-between items-center text-[9px] text-slate-400 border-b border-slate-100 pb-1 z-10 bg-white/90 backdrop-blur-[1px]">
                                <span className="font-bold">Hal {pageNum}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${isIncluded ? 'bg-red-500' : 'bg-slate-300'}`}></span>
                              </div>
                              
                              {/* Thumbnail preview body */}
                              <div className="flex-grow flex items-center justify-center w-full relative my-1.5 bg-slate-50 border border-slate-100 rounded-sm overflow-hidden h-16">
                                {previewImg ? (
                                  <img src={previewImg} className="w-full h-full object-contain" alt={`Hal ${pageNum}`} />
                                ) : (
                                  // Fallback simulated document lines
                                  <div className="flex flex-col justify-around h-full w-full p-1 opacity-20">
                                    <div className="h-0.5 bg-slate-800 rounded w-3/4"></div>
                                    <div className="h-0.5 bg-slate-800 rounded w-full"></div>
                                    <div className="h-0.5 bg-slate-800 rounded w-5/6"></div>
                                    <div className="h-0.5 bg-slate-800 rounded w-2/3"></div>
                                  </div>
                                )}
                                <span className={`absolute text-xs font-black ${isIncluded ? 'text-slate-800 bg-white/75 px-1 py-0.5 rounded shadow-sm' : 'text-slate-400'}`}>
                                  {pageNum}
                                </span>
                              </div>

                              {/* Footer status */}
                              <span className={`text-[9px] font-extrabold uppercase z-10 ${isIncluded ? 'text-red-600' : 'text-slate-400'}`}>
                                {isIncluded ? 'Cetak' : 'Lewati'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: Large Page Preview Panel */}
                      <div className="md:col-span-1 bg-slate-50 p-4 rounded-lg border border-slate-150 flex flex-col items-center justify-center space-y-3 h-52 md:h-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Detail Pratinjau</span>
                        
                        <div className="w-28 h-36 bg-white border border-slate-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
                          <span className="text-[8px] font-bold text-slate-400 border-b border-slate-100 pb-0.5">Halaman {hoveredPage}</span>
                          
                          <div className="flex-grow flex items-center justify-center w-full relative bg-slate-50 rounded-sm overflow-hidden my-2">
                            {pagePreviews[hoveredPage - 1] ? (
                              <img src={pagePreviews[hoveredPage - 1]} className="w-full h-full object-contain" alt={`Preview Hal ${hoveredPage}`} />
                            ) : (
                              // Detailed mock document text lines
                              <div className="flex flex-col justify-around h-full w-full p-2.5 opacity-25">
                                <div className="h-1 bg-slate-800 rounded w-1/2 mb-1"></div>
                                <div className="h-0.5 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-0.5 bg-slate-800 rounded w-full"></div>
                                <div className="h-0.5 bg-slate-800 rounded w-5/6"></div>
                                <div className="h-0.5 bg-slate-800 rounded w-2/3"></div>
                                <div className="h-0.5 bg-slate-800 rounded w-full"></div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-slate-400">Hal {hoveredPage}</span>
                            <span className={!excludedPages.includes(hoveredPage) ? "text-red-600" : "text-slate-400"}>
                              {!excludedPages.includes(hoveredPage) ? "Status: Cetak" : "Status: Lewati"}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Opsi Cetak */}
          <section className="form-section-anim opacity-0 space-y-4">
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
                  className={`w-full px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-medium ${
                    originalTotalPages > 1 ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                  }`}
                  readOnly={originalTotalPages > 1}
                />
                {originalTotalPages > 1 && (
                  <span className="text-[10px] text-red-500 block mt-1 font-semibold">
                    *Jumlah halaman dihitung otomatis dari pilihan halaman aktif Anda di atas.
                  </span>
                )}
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
            <section className="form-section-anim opacity-0 space-y-4">
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
          <section className="form-section-anim opacity-0 space-y-2">
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
          <section className="form-section-anim opacity-0 bg-red-50 border border-red-100 p-6 rounded-lg space-y-3">
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
