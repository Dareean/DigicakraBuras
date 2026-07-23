"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import gsap from "gsap";
import { UploadCloud, Trash2, Search, RotateCw, Copy } from "lucide-react";

interface CartItem {
  itemType: string;
  productId: number;
  qty: number;
  unitPrice: number;
  name: string;
}

interface VirtualPage {
  id: string;
  fileName: string;
  pageNum: number;
  rotation: number;
  previewUrl: string;
}

const getPdfPageCount = async (file: File): Promise<number> => {
  // Prefer using PDF.js to get an accurate page count. Fallback to text heuristic if PDF.js fails.
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
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        resolve(pdfjs);
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(script);
    });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages || 1;
  } catch (err) {
    // Fallback: original text-based heuristic (less reliable)
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
  }
};

const renderPdfThumbnails = async (
  file: File,
  maxPages = 16,
): Promise<string[]> => {
  try {
    const pdfjsLib = await new Promise<any>((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
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

const renderMockPageContent = (pageNum: number) => {
  switch (pageNum % 4) {
    case 1:
      return (
        <div className="flex flex-col h-full w-full p-2 space-y-1 bg-white select-none text-left">
          <div className="h-1.5 bg-slate-800 rounded w-1/2 mb-1.5"></div>
          <div className="border border-slate-200 rounded flex flex-col divide-y divide-slate-100 text-[6px]">
            <div className="grid grid-cols-3 bg-slate-100 p-0.5 font-bold">
              <span>Hari</span>
              <span>Tugas</span>
              <span>Status</span>
            </div>
            <div className="grid grid-cols-3 p-0.5">
              <span>Senin</span>
              <span>Cetak</span>
              <span>Lunas</span>
            </div>
            <div className="grid grid-cols-3 p-0.5">
              <span>Selasa</span>
              <span>ATK</span>
              <span>Antre</span>
            </div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col h-full w-full p-2 space-y-1 bg-white select-none text-left">
          <div className="h-1.5 bg-slate-800 rounded w-2/3 mb-1.5"></div>
          <div className="h-1 bg-slate-200 rounded w-full"></div>
          <div className="h-1 bg-slate-200 rounded w-full"></div>
          <div className="h-1 bg-slate-200 rounded w-5/6"></div>
          <div className="h-1 bg-slate-200 rounded w-3/4"></div>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col h-full w-full p-2 space-y-1 bg-white select-none text-left">
          <div className="h-1.5 bg-slate-800 rounded w-1/2 mb-1.5"></div>
          <div className="flex items-center space-x-1">
            <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></span>
            <div className="h-1 bg-slate-200 rounded w-2/3"></div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></span>
            <div className="h-1 bg-slate-200 rounded w-3/4"></div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></span>
            <div className="h-1 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      );
    case 0:
    default:
      return (
        <div className="flex flex-col h-full w-full p-2 bg-white select-none justify-between text-left">
          <div className="h-1.5 bg-slate-800 rounded w-3/4"></div>
          <div className="flex items-end justify-around h-10 w-full pt-1">
            <div className="w-1.5 bg-red-500 h-1/2 rounded-t-sm"></div>
            <div className="w-1.5 bg-red-600 h-3/4 rounded-t-sm"></div>
            <div className="w-1.5 bg-slate-300 h-1/3 rounded-t-sm"></div>
          </div>
        </div>
      );
  }
};

const getAtkVisualDetails = (name: string) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("pensil") || lowercase.includes("pencil")) {
    return { icon: "", bg: "bg-amber-50 border-amber-200 text-amber-600" };
  }
  if (lowercase.includes("pulpen") || lowercase.includes("pen")) {
    return { icon: "", bg: "bg-blue-50 border-blue-200 text-blue-600" };
  }
  if (
    lowercase.includes("buku") ||
    lowercase.includes("notebook") ||
    lowercase.includes("binder")
  ) {
    return {
      icon: "",
      bg: "bg-emerald-50 border-emerald-200 text-emerald-600",
    };
  }
  if (lowercase.includes("kertas") || lowercase.includes("hvs")) {
    return { icon: "", bg: "bg-slate-50 border-slate-200 text-slate-600" };
  }
  if (lowercase.includes("penggaris") || lowercase.includes("ruler")) {
    return { icon: "", bg: "bg-indigo-50 border-indigo-200 text-indigo-600" };
  }
  if (lowercase.includes("penghapus") || lowercase.includes("eraser")) {
    return { icon: "", bg: "bg-pink-50 border-pink-200 text-pink-600" };
  }
  if (lowercase.includes("map") || lowercase.includes("folder")) {
    return { icon: "", bg: "bg-yellow-50 border-yellow-200 text-yellow-600" };
  }
  return { icon: "", bg: "bg-red-50 border-red-200 text-red-600" };
};

// Simple IndexedDB wrapper for storing File objects
const DB_NAME = "digicakra_order_temp";
const STORE_NAME = "files";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveFileToDB = async (file: File): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name: file.name, file });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getFileFromDB = async (name: string): Promise<File | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(name);
      request.onsuccess = () => {
        resolve(request.result ? request.result.file : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB error:", e);
    return null;
  }
};

const clearDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB clear error:", e);
  }
};

export default function OrderConfig() {
  // Customer identity
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [virtualPages, setVirtualPages] = useState<VirtualPage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [largePreviewPage, setLargePreviewPage] = useState<VirtualPage | null>(
    null,
  );
  const [excludedPages, setExcludedPages] = useState<string[]>([]);
  const [hoveredPage, setHoveredPage] = useState<number>(1);

  // Load GSAP animations on mount
  useEffect(() => {
    gsap.fromTo(
      ".form-section-anim",
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" },
    );
  }, []);



  // Print options
  const [pages, setPages] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [colorType, setColorType] = useState<"bw" | "color">("bw"); // bw = Hitam Putih, color = Warna

  // Addons (only editable if file is uploaded)
  const [hasJilid, setHasJilid] = useState(false);
  const [hasLaminating, setHasLaminating] = useState(false);

  // ATK Cart items loaded from landing page
  const [atkItems, setAtkItems] = useState<CartItem[]>([]);
  const [pickupNote, setPickupNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Memproses Pesanan...");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Restore state from sessionStorage & IndexedDB on mount
  useEffect(() => {
    const savedName = sessionStorage.getItem("order_fullName");
    const savedWhatsapp = sessionStorage.getItem("order_whatsapp");
    const savedCopies = sessionStorage.getItem("order_copies");
    const savedColorType = sessionStorage.getItem("order_colorType");
    const savedHasJilid = sessionStorage.getItem("order_hasJilid");
    const savedHasLaminating = sessionStorage.getItem("order_hasLaminating");
    const savedPickupNote = sessionStorage.getItem("order_pickupNote");
    const savedExcludedPages = sessionStorage.getItem("order_excludedPages");
    const savedVirtualPagesStr = sessionStorage.getItem("order_virtualPages");

    if (savedName) setFullName(savedName);
    if (savedWhatsapp) setWhatsapp(savedWhatsapp);
    if (savedCopies) setCopies(Number(savedCopies));
    if (savedColorType) setColorType(savedColorType as "bw" | "color");
    if (savedHasJilid) setHasJilid(savedHasJilid === "true");
    if (savedHasLaminating) setHasLaminating(savedHasLaminating === "true");
    if (savedPickupNote) setPickupNote(savedPickupNote);
    if (savedExcludedPages) setExcludedPages(JSON.parse(savedExcludedPages));

    if (savedVirtualPagesStr) {
      const parsedPages: VirtualPage[] = JSON.parse(savedVirtualPagesStr);
      
      const restoreFiles = async () => {
        setLoading(true);
        setLoadingMessage("Memulihkan berkas...");
        const uniqueFileNames = Array.from(new Set(parsedPages.map(p => p.fileName)));
        const restoredFilesList: File[] = [];
        const updatedPages = [...parsedPages];

        for (const fileName of uniqueFileNames) {
          const fileObj = await getFileFromDB(fileName);
          if (fileObj) {
            restoredFilesList.push(fileObj);
            
            // Re-generate blob URLs for images
            if (fileObj.type.startsWith("image/")) {
              const newObjectUrl = URL.createObjectURL(fileObj);
              updatedPages.forEach(p => {
                if (p.fileName === fileName) {
                  p.previewUrl = newObjectUrl;
                }
              });
            }
          }
        }

        setSelectedFiles(restoredFilesList);
        setVirtualPages(updatedPages);
        setLoading(false);
      };

      restoreFiles().catch(err => {
        console.error("Gagal memulihkan file:", err);
        setLoading(false);
      });
    }
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("order_fullName", fullName);
  }, [fullName]);

  useEffect(() => {
    sessionStorage.setItem("order_whatsapp", whatsapp);
  }, [whatsapp]);

  useEffect(() => {
    sessionStorage.setItem("order_copies", String(copies));
  }, [copies]);

  useEffect(() => {
    sessionStorage.setItem("order_colorType", colorType);
  }, [colorType]);

  useEffect(() => {
    sessionStorage.setItem("order_hasJilid", String(hasJilid));
  }, [hasJilid]);

  useEffect(() => {
    sessionStorage.setItem("order_hasLaminating", String(hasLaminating));
  }, [hasLaminating]);

  useEffect(() => {
    sessionStorage.setItem("order_pickupNote", pickupNote);
  }, [pickupNote]);

  useEffect(() => {
    sessionStorage.setItem("order_excludedPages", JSON.stringify(excludedPages));
  }, [excludedPages]);

  useEffect(() => {
    if (virtualPages.length > 0) {
      // Strip blob URLs to avoid storing stale URLs
      const pagesToStore = virtualPages.map(p => ({
        ...p,
        previewUrl: p.previewUrl.startsWith("blob:") ? "" : p.previewUrl
      }));
      sessionStorage.setItem("order_virtualPages", JSON.stringify(pagesToStore));
    } else {
      sessionStorage.removeItem("order_virtualPages");
    }
  }, [virtualPages]);

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
    if (e.target.files) {
      setLoading(true);
      setLoadingMessage("Membaca berkas...");
      const files = Array.from(e.target.files);

      for (const file of files) {
        try {
          await saveFileToDB(file);
        } catch (dbErr) {
          console.error("Gagal menyimpan ke IndexedDB:", dbErr);
        }
      }

      setSelectedFiles((prev) => [...prev, ...files]);
      const newPages: VirtualPage[] = [];

      for (const file of files) {
        if (file.type === "application/pdf") {
          const count = await getPdfPageCount(file);
          let previews: string[] = [];
          try {
            previews = await renderPdfThumbnails(file);
          } catch (err) {
            console.error(err);
          }
          for (let i = 1; i <= count; i++) {
            newPages.push({
              id: Math.random().toString(36).substring(7),
              fileName: file.name,
              pageNum: i,
              rotation: 0,
              previewUrl: previews[i - 1] || "",
            });
          }
        } else {
          // Image or other files treated as a single page
          const objectUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : "";
          newPages.push({
            id: Math.random().toString(36).substring(7),
            fileName: file.name,
            pageNum: 1,
            rotation: 0,
            previewUrl: objectUrl,
          });
        }
      }

      setVirtualPages((prev) => [...prev, ...newPages]);
      setLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Mock file for quick testing without actual upload
  const setMockFile = () => {
    const mockFileName = "Tabel Timeline P.pdf";
    const newPages: VirtualPage[] = Array.from({ length: 4 }).map((_, idx) => ({
      id: Math.random().toString(36).substring(7),
      fileName: mockFileName,
      pageNum: idx + 1,
      rotation: 0,
      previewUrl: "",
    }));
    setVirtualPages(newPages);
  };

  const togglePageSelection = (id: string) => {
    setExcludedPages((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      } else {
        const next = [...prev, id];
        if (next.length === virtualPages.length) {
          showToast("Anda harus mencetak minimal 1 halaman!", "error");
          return prev;
        }
        return next;
      }
    });
  };

  const deletePage = (id: string) => {
    setVirtualPages((prev) => prev.filter((p) => p.id !== id));
    setExcludedPages((prev) => prev.filter((p) => p !== id));
  };

  const rotatePage = (id: string) => {
    setVirtualPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
      ),
    );
  };

  const duplicatePage = (id: string) => {
    setVirtualPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy: VirtualPage = {
        ...original,
        id: Math.random().toString(36).substring(7),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const updateAtkQty = (productId: number, delta: number) => {
    setAtkItems((prev) => {
      const next = prev.map((item) => {
        if (item.productId === productId) {
          const nextQty = Math.max(1, item.qty + delta);
          return { ...item, qty: nextQty };
        }
        return item;
      });
      localStorage.setItem("atk_cart", JSON.stringify(next));
      return next;
    });
  };

  const removeAtkItem = (productId: number) => {
    setAtkItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      if (next.length === 0) {
        localStorage.removeItem("atk_cart");
      } else {
        localStorage.setItem("atk_cart", JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    setPages(virtualPages.length - excludedPages.length);
  }, [virtualPages, excludedPages]);

  // Calculate prices
  const getPrintUnitPrice = () => {
    return colorType === "bw" ? 500 : 1500; // Rp 500 for BW, Rp 1500 for Color
  };

  const getPrintAddonsTotal = () => {
    let sum = 0;
    if (hasJilid) sum += 5000;
    if (hasLaminating) sum += 4000;
    return sum * copies;
  };

  const getPrintSubtotal = () => {
    const isFileUploaded = virtualPages.length > 0;
    if (!isFileUploaded) return 0;
    return getPrintUnitPrice() * pages * copies + getPrintAddonsTotal();
  };

  const getAtkTotal = () => {
    return atkItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  };

  const getTotalAmount = () => {
    return getPrintSubtotal() + getAtkTotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast("Nama Lengkap wajib diisi!", "error");
      return;
    }

    if (!whatsapp.trim() || whatsapp.length < 9) {
      showToast("Nomor WhatsApp tidak valid!", "error");
      return;
    }

    const hasFile = virtualPages.length > 0;
    const hasAtk = atkItems.length > 0;

    if (!hasFile && !hasAtk) {
      showToast(
        "Pilih berkas untuk dicetak atau belanja ATK terlebih dahulu!",
        "error",
      );
      return;
    }

    setLoading(true);

    // Prepare order data
    const orderItems: any[] = [];

    if (hasFile) {
      const addons = [];
      if (hasJilid) addons.push({ addonType: "jilid", price: 5000 * copies });
      if (hasLaminating)
        addons.push({ addonType: "laminating", price: 4000 * copies });

      const printedPages = virtualPages
        .map((vp, idx) => ({ ...vp, seq: idx + 1 }))
        .filter((vp) => !excludedPages.includes(vp.id))
        .map((vp) => vp.seq);

      const actualPages = virtualPages.length - excludedPages.length;

      orderItems.push({
        itemType: "print_doc",
        productId: null,
        qty: copies,
        unitPrice: getPrintUnitPrice() * actualPages,
        fileUrl: virtualPages[0]?.fileName || "dokumen_cetak.pdf",
        specJson: {
          pages: actualPages,
          copies: copies,
          color: colorType,
          fileName: virtualPages
            .map((vp) => vp.fileName)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", "),
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
      setLoadingMessage("Memproses pesanan...");
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
        // Find which files from selectedFiles are actually in virtualPages
        const activeFileNames = new Set(virtualPages.map((p) => p.fileName));
        const filesToUpload = selectedFiles.filter((f) =>
          activeFileNames.has(f.name),
        );

        if (filesToUpload.length > 0) {
          setLoadingMessage("Mengunggah berkas cetak...");
          const formData = new FormData();
          formData.append("orderId", String(data.orderId));
          filesToUpload.forEach((file) => {
            formData.append("files", file);
          });

          const uploadRes = await fetch("/api/upload/print-document", {
            method: "POST",
            body: formData,
          });

          const uploadData = await uploadRes.json();
          if (!uploadData.success) {
            throw new Error(
              uploadData.error || "Gagal mengunggah berkas cetak",
            );
          }
        }

        // Clear local storage cart
        localStorage.removeItem("atk_cart");
        // Clear session storage and IndexedDB
        sessionStorage.clear();
        await clearDB();
        // Redirect to checkout payment
        window.location.href = `/checkout/${data.orderCode}`;
      } else {
        showToast(data.error || "Gagal memproses pesanan", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Terjadi kesalahan koneksi", "error");
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Konfigurasi Pesanan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Lengkapi detail pesanan Anda untuk proses yang lebih cepat.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 bg-white p-4 sm:p-8 rounded-lg border border-slate-200 shadow-sm"
        >
          {/* Identitas Pelanggan */}
          <section className="form-section-anim opacity-0 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
              Identitas Pelanggan
            </h2>
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
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
              Unggah Berkas & Susun Halaman
            </h2>

            {virtualPages.length === 0 ? (
              <div
                onClick={triggerFileSelect}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-all hover:border-red-300"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,image/*"
                  multiple
                  className="hidden"
                />

                <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />

                <p className="text-sm font-bold text-slate-800">
                  Tarik & Lepas berkas di sini
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung PDF, gambar, atau berkas cetak lainnya
                </p>

                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
                >
                  Pilih Berkas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hidden input for adding more files */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,image/*"
                  multiple
                  className="hidden"
                />

                {/* Horizontal virtual pages layout */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 scrollbar-thin max-w-full px-1">
                  {virtualPages.map((page, idx) => {
                    const isExcluded = excludedPages.includes(page.id);
                    const isIncluded = !isExcluded;

                    return (
                      <div
                        key={page.id}
                        className="flex items-center gap-3 flex-shrink-0"
                      >
                        {/* Page card container */}
                        <div className="relative group w-40 flex flex-col items-center bg-white border border-slate-250 rounded-lg p-2.5 shadow-sm hover:shadow transition-all">
                          {/* Checked Box indicator */}
                          <div className="absolute top-3.5 left-3.5 z-20">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => togglePageSelection(page.id)}
                              className="w-4.5 h-4.5 text-red-650 border-slate-350 rounded focus:ring-red-500 cursor-pointer accent-red-600"
                            />
                          </div>

                          {/* Quick Toolbar (Zoom, Rotate, Duplicate, Delete) */}
                          <div className="absolute top-2.5 right-2.5 z-20 flex gap-1 bg-white/95 backdrop-blur-[1px] p-1 rounded border border-slate-150 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setLargePreviewPage(page)}
                              title="Perbesar"
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 text-[10px]"
                            >
                              <Search size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => rotatePage(page.id)}
                              title="Putar"
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 text-[10px]"
                            >
                              <RotateCw size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicatePage(page.id)}
                              title="Duplikat"
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 text-[10px]"
                            >
                              <Copy size={18} />
                            </button>
                            {/* <button
                              type="button"
                              onClick={() => deletePage(page.id)}
                              title="Hapus"
                              className="p-1 hover:bg-slate-100 rounded text-red-500 hover:text-red-700 text-[10px]"
                            >
                              <Trash2 size={18} />
                            </button> */}
                          </div>

                          {/* Thumbnail preview body */}
                          <div className="relative w-36 h-48 bg-slate-50 rounded border border-slate-150 overflow-hidden flex items-center justify-center mt-6">
                            {/* Blue trash overlay on hover */}
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(page.id);
                                }}
                                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            <div
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                              }}
                              className="w-full h-full transition-transform duration-200"
                            >
                              {page.previewUrl ? (
                                <img
                                  src={page.previewUrl}
                                  className="w-full h-full object-contain"
                                  alt={`Hal ${page.pageNum}`}
                                />
                              ) : (
                                // Render beautiful custom mock content
                                renderMockPageContent(page.pageNum)
                              )}
                            </div>

                            {/* Dim Overlay when excluded */}
                            {isExcluded && (
                              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[0.5px] flex items-center justify-center z-10">
                                <span className="px-2 py-1 bg-slate-800/90 text-white font-extrabold text-[9px] rounded uppercase tracking-wider shadow">
                                  Dilewati
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Footer label */}
                          <div className="w-full text-center mt-3 text-xs">
                            <span className="font-bold text-slate-800 line-clamp-1 bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[9px] block">
                              {page.fileName.length > 18
                                ? page.fileName.substring(0, 15) + "..."
                                : page.fileName}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-1 font-extrabold">
                              {idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Plus button between cards */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center shadow-sm font-black transition-all flex-shrink-0 text-sm hover:scale-105 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}

                  {/* Dotted add-more card on the far right */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-72 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/20 hover:bg-blue-50/50 cursor-pointer flex flex-col items-center justify-center p-4 text-center gap-2 flex-shrink-0 transition-all hover:border-blue-400 group"
                  >
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                      +
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      Tambah Berkas
                    </span>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Add PDF, image, Word, Excel, and PowerPoint files
                    </p>
                  </div>
                </div>

                {/* Reset button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVirtualPages([]);
                      setExcludedPages([]);
                      setSelectedFiles([]);
                      setPages(1);
                      clearDB();
                      sessionStorage.removeItem("order_virtualPages");
                      sessionStorage.removeItem("order_excludedPages");
                    }}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold hover:underline"
                  >
                    Hapus Semua Berkas
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Opsi Cetak */}
          <section className="form-section-anim opacity-0 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
              Opsi Cetak
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Jumlah Halaman */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah Halaman
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${pages} Halaman`}
                  className="w-full px-4 h-11 border border-slate-200 rounded-md bg-slate-100 text-slate-500 font-medium text-sm focus:outline-none"
                />
                {virtualPages.length > 0 && (
                  <span className="text-[9px] text-slate-450 block mt-1 leading-normal">
                    *Dihitung otomatis dari pilihan halaman aktif Anda.
                  </span>
                )}
              </div>

              {/* Jumlah Rangkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah Rangkap (Copies)
                </label>
                <input
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) =>
                    setCopies(Math.max(1, Number(e.target.value)))
                  }
                  className="w-full px-4 h-11 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-semibold bg-white"
                />
                <span className="text-[9px] text-slate-450 block mt-1 leading-normal">
                  *Masukkan jumlah cetakan set dokumen yang Anda inginkan.
                </span>
              </div>

              {/* Warna Cetak */}
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
            {virtualPages.length > 0 && (
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
                      <span className="text-xs font-bold text-slate-800">
                        Jilid Dokumen
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-red-600">
                      + Rp 5.000
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-slate-300">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hasLaminating}
                        onChange={(e) => setHasLaminating(e.target.checked)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Laminating
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-red-600">
                      + Rp 4.000
                    </span>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* ATK Items Summary */}
          {atkItems.length > 0 ? (
            <section className="form-section-anim opacity-0 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="text-lg font-bold text-slate-800">
                  ATK yang Dipesan
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("atk_cart");
                    setAtkItems([]);
                  }}
                  className="text-xs text-red-500 hover:underline font-bold"
                >
                  Hapus Semua ATK
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {atkItems.map((item, idx) => {
                  const visual = getAtkVisualDetails(item.name);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-md transition-all gap-3 text-xs"
                    >
                      {/* Left: Icon & Product Info */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="text-left min-w-0 flex-1">
                          <span
                            className="font-bold text-slate-800 text-xs block truncate"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Rp {item.unitPrice.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      {/* Right: Qty Selector & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto border-t border-slate-150 pt-2.5 sm:border-t-0 sm:pt-0">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-slate-200 rounded bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateAtkQty(item.productId, -1)}
                            className="w-5.5 h-5.5 flex items-center justify-center text-slate-500 hover:bg-slate-250 hover:bg-slate-200 rounded transition-all text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateAtkQty(item.productId, 1)}
                            className="w-5.5 h-5.5 flex items-center justify-center text-slate-500 hover:bg-slate-250 hover:bg-slate-200 rounded transition-all text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="text-right flex flex-col justify-center items-end min-w-[75px]">
                          <span className="font-extrabold text-slate-900 text-xs">
                            Rp{" "}
                            {(item.unitPrice * item.qty).toLocaleString(
                              "id-ID",
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAtkItem(item.productId)}
                            className="text-[10px] text-red-500 hover:underline font-bold mt-0.5"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="form-section-anim opacity-0 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="text-lg font-bold text-slate-800">
                  ATK yang Dipesan
                </h2>
              </div>
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                Belum ada produk ATK yang dipilih.
                <a
                  href="/#katalog"
                  className="text-red-500 font-bold ml-1 hover:underline"
                >
                  Lihat Katalog ATK →
                </a>
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
          <section className="form-section-anim opacity-0 bg-red-50 border border-red-100 p-4 sm:p-6 rounded-lg space-y-3">
            <h3 className="font-bold text-red-950 text-sm">
              Rincian Estimasi Biaya
            </h3>

            <div className="space-y-1.5 text-xs text-red-900 border-b border-red-200/50 pb-3">
              {virtualPages.length > 0 && (
                <div className="flex justify-between">
                  <span>
                    Cetak Jasa ({pages} hal x {copies} rangkap x Rp{" "}
                    {getPrintUnitPrice().toLocaleString("id-ID")}):
                  </span>
                  <span>
                    Rp{" "}
                    {(getPrintUnitPrice() * pages * copies).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
              )}

              {hasJilid && (
                <div className="flex justify-between">
                  <span>Add-on Jilid ({copies} rangkap):</span>
                  <span>Rp {(5000 * copies).toLocaleString("id-ID")}</span>
                </div>
              )}

              {hasLaminating && (
                <div className="flex justify-between">
                  <span>Add-on Laminating ({copies} rangkap):</span>
                  <span>Rp {(4000 * copies).toLocaleString("id-ID")}</span>
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
              <span className="text-sm font-bold text-red-950">
                Total Pembayaran:
              </span>
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
                {loadingMessage}
              </>
            ) : (
              "Lanjut ke Selesaikan Pembayaran"
            )}
          </button>
        </form>

        {/* Zoom Preview Modal */}
        {largePreviewPage && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4 border-t-8 border-t-slate-900 relative text-xs">
              <button
                type="button"
                onClick={() => setLargePreviewPage(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>

              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-800">
                  Pratinjau Halaman{" "}
                  {virtualPages.findIndex((p) => p.id === largePreviewPage.id) +
                    1}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {largePreviewPage.fileName}
                </p>
              </div>

              <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded p-4 h-96 overflow-hidden">
                <div
                  style={{
                    transform: `rotate(${largePreviewPage.rotation}deg)`,
                  }}
                  className="w-full h-full flex items-center justify-center transition-transform duration-200"
                >
                  {largePreviewPage.previewUrl ? (
                    <img
                      src={largePreviewPage.previewUrl}
                      className="max-w-full max-h-full object-contain shadow"
                      alt="Pratinjau Besar"
                    />
                  ) : (
                    // Mock zoom layout
                    <div className="w-56 h-72 bg-white border border-slate-250 rounded shadow-lg p-4 flex flex-col justify-between select-none">
                      <span className="text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1">
                        Tabel Timeline P.pdf
                      </span>
                      <div className="flex-grow my-4 flex flex-col justify-around">
                        {renderMockPageContent(largePreviewPage.pageNum)}
                      </div>
                      <span className="text-[10px] text-slate-400 text-right font-bold block">
                        Hal {largePreviewPage.pageNum}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    rotatePage(largePreviewPage.id);
                    setLargePreviewPage((prev) =>
                      prev
                        ? { ...prev, rotation: (prev.rotation + 90) % 360 }
                        : null,
                    );
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition-all"
                >
                  Putar 90°
                </button>
                <button
                  type="button"
                  onClick={() => setLargePreviewPage(null)}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-850 rounded transition-all shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-center p-4 bg-slate-900/95 text-white rounded-lg shadow-2xl border-l-4 border-emerald-500 backdrop-blur-md max-w-sm transition-all duration-300">
          <div className="mr-3 flex-shrink-0">
            {toast.type === "success" ? (
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="bg-red-500/20 text-red-400 p-1.5 rounded-full">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="text-xs font-bold">{toast.message}</div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-slate-900/95 border border-slate-800 p-8 shadow-2xl shadow-black/40">
            <div className="h-16 w-16 rounded-full border-4 border-slate-700 border-t-red-500 animate-spin" />
            <p className="text-sm font-semibold text-white text-center">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
