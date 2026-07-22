/**
 * @file src/lib/storage.ts
 * @description Helper functions untuk Supabase Storage.
 *
 * Digunakan SERVER-SIDE saja — menggunakan service role key.
 * Jangan import file ini di Client Components.
 *
 * Buckets:
 *  - print-documents (private) → PDF pesanan customer, signed URL 1 jam
 *  - product-images  (public)  → Foto produk ATK, public URL permanen
 */

import { createClient } from "@supabase/supabase-js";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = {
  PRINT_DOCS: "print-documents",
  PRODUCT_IMAGES: "product-images",
} as const;

const SIGNED_URL_EXPIRY_SECONDS = 3_600; // 1 jam

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * Buat Supabase client dengan service role key.
 * Dibuat per-call (tidak perlu singleton) karena hanya dipakai server-side.
 */
function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[storage] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di .env"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Print Documents (Private) ────────────────────────────────────────────────

/**
 * Upload PDF dokumen cetak customer ke bucket private.
 * @returns Path file di storage (disimpan ke DB sebagai fileUrl)
 */
export async function uploadPrintDocument(
  fileBuffer: Uint8Array,
  originalFilename: string,
  orderId: number
): Promise<string> {
  const client = getStorageClient();

  // Sanitasi nama file: spasi → underscore, karakter khusus dihapus
  const safeName = originalFilename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
  const storagePath = `orders/${orderId}/${Date.now()}_${safeName}`;

  const { error } = await client.storage
    .from(BUCKET.PRINT_DOCS)
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    throw new Error(`[storage] Gagal upload PDF: ${error.message}`);
  }

  return storagePath;
}

/**
 * Buat signed URL sementara (1 jam) untuk dokumen private.
 * Gunakan ini saat admin ingin membuka file customer.
 */
export async function getDocumentSignedUrl(storagePath: string): Promise<string> {
  const client = getStorageClient();

  const { data, error } = await client.storage
    .from(BUCKET.PRINT_DOCS)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`[storage] Gagal membuat signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Hapus semua file PDF milik sebuah order dari storage.
 * Dipanggil saat status order diubah menjadi "selesai".
 */
export async function deletePrintDocumentsByOrder(orderId: number): Promise<void> {
  const client = getStorageClient();

  // List semua file dalam folder order
  const { data: files, error: listError } = await client.storage
    .from(BUCKET.PRINT_DOCS)
    .list(`orders/${orderId}`);

  if (listError || !files || files.length === 0) return;

  const paths = files.map((f) => `orders/${orderId}/${f.name}`);

  const { error: deleteError } = await client.storage
    .from(BUCKET.PRINT_DOCS)
    .remove(paths);

  if (deleteError) {
    // Log saja, jangan throw — jangan gagalkan update status hanya karena file
    console.error(`[storage] Gagal hapus file order ${orderId}:`, deleteError.message);
  }
}

// ─── Product Images (Public) ──────────────────────────────────────────────────

/**
 * Upload foto produk ATK ke bucket public.
 * @returns Public URL gambar yang bisa langsung dipakai di <img src>
 */
export async function uploadProductImage(
  fileBuffer: Uint8Array,
  originalFilename: string,
  contentType: string
): Promise<string> {
  const client = getStorageClient();

  const ext = originalFilename.split(".").pop() ?? "jpg";
  const storagePath = `products/${Date.now()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET.PRODUCT_IMAGES)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`[storage] Gagal upload gambar produk: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET.PRODUCT_IMAGES).getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Hapus foto produk lama dari storage saat diganti foto baru.
 * Path diambil dari URL: ambil bagian setelah "/product-images/"
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  if (!publicUrl || !publicUrl.includes(BUCKET.PRODUCT_IMAGES)) return;

  const client = getStorageClient();

  // Ekstrak path dari public URL
  const marker = `/${BUCKET.PRODUCT_IMAGES}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const storagePath = publicUrl.slice(idx + marker.length);

  const { error } = await client.storage
    .from(BUCKET.PRODUCT_IMAGES)
    .remove([storagePath]);

  if (error) {
    console.error("[storage] Gagal hapus gambar produk lama:", error.message);
  }
}
