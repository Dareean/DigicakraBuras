"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { SquarePen, Trash2 } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  stockQty: number;
  category: string;
  isActive: boolean;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("staff");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState(0);
  const [stockQty, setStockQty] = useState(0);
  const [category, setCategory] = useState("Alat Tulis");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadSessionAndProducts = async () => {
    try {
      const sessionRes = await fetch("/api/admin/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData.user) {
        setUserRole(sessionData.user.role);
      }

      const productsRes = await fetch("/api/admin/products");
      const productsData = await productsRes.json();
      setProducts(productsData);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionAndProducts();
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const openAddModal = () => {
    if (userRole === "staff") {
      showToast("Hanya Owner yang dapat menambahkan produk baru.", "error");
      return;
    }
    setEditingProduct(null);
    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setPrice(0);
    setStockQty(0);
    setCategory("Alat Tulis");
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setImageUrl(p.imageUrl || "");
    setImageFile(null);
    setPrice(p.price);
    setStockQty(p.stockQty);
    setCategory(p.category);
    setIsActive(p.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalImageUrl = imageUrl;

    try {
      // If there is a new image file, upload it first
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/upload/product-image", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || "Gagal mengunggah foto produk");
        }
        finalImageUrl = uploadData.imageUrl;
      }

      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit && userRole === "staff"
        ? { stockQty: Number(stockQty) } // Staff can only update stock
        : {
            name,
            description,
            imageUrl: finalImageUrl,
            price: Number(price),
            stockQty: Number(stockQty),
            category,
            isActive,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        showToast("Produk berhasil disimpan!", "success");
        setShowModal(false);
        loadSessionAndProducts();
      } else {
        showToast(data.error || "Gagal menyimpan produk", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Terjadi kesalahan jaringan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (userRole !== "owner") {
      showToast("Hanya Owner yang dapat menonaktifkan produk.", "error");
      return;
    }

    if (confirm("Apakah Anda yakin ingin menonaktifkan produk ini dari katalog?")) {
      try {
        const response = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          showToast("Produk berhasil dinonaktifkan", "success");
          loadSessionAndProducts();
        } else {
          showToast(data.error || "Gagal menghapus produk", "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Kesalahan jaringan", "error");
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Title & Add button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Katalog ATK</h1>
            <p className="text-slate-500 text-xs mt-0.5">Kelola data perlengkapan dan persediaan ATK toko.</p>
          </div>
          {userRole === "owner" && (
            <button
              onClick={openAddModal}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              + Tambah Produk
            </button>
          )}
        </div>

        {/* Table list */}
        {loading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-2"></div>
            <p className="text-slate-500 text-xs">Memuat katalog...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nama Produk</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Harga Jual</th>
                    <th className="px-6 py-4 text-center">Jumlah Stok</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={p.imageUrl || "/placeholder.png"}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/100x100/e2e8f0/475569?text=ATK`;
                            }}
                          />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{p.name}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.description || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{p.category}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        Rp {p.price.toLocaleString("id-ID")}
                      </td>
                      <td className={`px-6 py-4 text-center font-bold ${p.stockQty <= 10 ? "text-amber-600" : "text-slate-800"}`}>
                        {p.stockQty}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase border border-emerald-100">Aktif</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-bold uppercase">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
                        >
                          <SquarePen size={18} />
                        </button>
                        {userRole === "owner" && p.isActive && (
                          <button
                            onClick={() => handleDeactivate(p.id)}
                            className="text-xs text-red-600 hover:text-red-800 hover:underline font-bold"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4 border-t-8 border-t-red-600">
            
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {editingProduct ? "Ubah Produk" : "Tambah Produk Baru"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {userRole === "staff" ? "Sebagai staf, Anda hanya dapat mengubah stok." : "Lengkapi data spesifikasi produk ATK."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={editingProduct !== null && userRole === "staff"}
                  className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={editingProduct !== null && userRole === "staff"}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white disabled:bg-slate-100 disabled:text-slate-400 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Foto Produk
                </label>
                
                {/* Image Preview */}
                {(imageFile || imageUrl) && (
                  <div className="mb-2 relative w-20 h-20 rounded border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                    {imageFile && !(editingProduct !== null && userRole === "staff") && (
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        className="absolute top-0 right-0 bg-red-650 text-white w-4.5 h-4.5 text-[9px] font-bold rounded-bl flex items-center justify-center hover:bg-red-700 cursor-pointer"
                        title="Hapus gambar terpilih"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* File Input */}
                {!(editingProduct !== null && userRole === "staff") ? (
                  <div className="flex items-center gap-2">
                    <label className="flex items-center justify-center px-3.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                      <span>Pilih Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {imageFile ? imageFile.name : "Format JPG/PNG, maks. 5MB"}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">Hanya owner yang dapat mengubah foto</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    disabled={editingProduct !== null && userRole === "staff"}
                    className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={editingProduct !== null && userRole === "staff"}
                    className="w-full px-3 h-9 border border-slate-200 rounded focus:outline-none focus:border-red-500 font-medium bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="Alat Tulis">Alat Tulis</option>
                    <option value="Pena & Pensil">Pena & Pensil</option>
                    <option value="Penghapus & Koreksi">Penghapus & Koreksi</option>
                    <option value="Penggaris & Pengukur">Penggaris & Pengukur</option>
                    <option value="Kertas & Buku">Kertas & Buku</option>
                  </select>
                </div>

                {userRole === "owner" && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Status Aktif
                    </span>
                    <label className="flex items-center space-x-2 h-9">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-350 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="font-bold text-slate-700">Tampilkan di katalog</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center"
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5"></div>
                  )}
                  Simpan Produk
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all"
                >
                  Batal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex items-center p-4 bg-slate-900/95 text-white rounded-lg shadow-2xl border-l-4 border-emerald-500 backdrop-blur-md max-w-sm transition-all duration-300">
          <div className="mr-3 flex-shrink-0">
            {toast.type === "success" ? (
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="bg-red-500/20 text-red-400 p-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <div className="text-xs font-bold">{toast.message}</div>
        </div>
      )}
    </AdminLayout>
  );
}
