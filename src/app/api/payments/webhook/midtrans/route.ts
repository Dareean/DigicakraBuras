/**
 * @file src/app/api/payments/webhook/midtrans/route.ts
 * @description Webhook handler untuk notifikasi pembayaran dari Midtrans.
 *
 * Flow:
 *  1. Terima POST dari Midtrans
 *  2. Verifikasi signature_key (SHA512 hash) untuk keamanan
 *  3. Update status Payment dan Order berdasarkan transaction_status
 *  4. Jalankan post-payment logic (deduct inventory, tambah loyalty stamp)
 *
 * Setup:
 *  - Set URL webhook ini di Midtrans Dashboard → Settings → Configuration
 *  - URL: https://your-domain.com/api/payments/webhook/midtrans
 *  - Untuk development lokal, gunakan ngrok: https://xxxx.ngrok.io/api/payments/webhook/midtrans
 *
 * Docs: https://docs.midtrans.com/reference/receiving-notifications
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { deductInventoryAndLoyalty } from "@/app/api/orders/route";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Status dari Midtrans yang dianggap sebagai "pembayaran berhasil".
 * - settlement: QRIS & transfer bank — pembayaran dikonfirmasi penuh
 * - capture: kartu kredit — tidak dipakai di sini tapi disertakan untuk kelengkapan
 */
const SETTLEMENT_STATUSES = new Set(["settlement", "capture"]);

/**
 * Status dari Midtrans yang dianggap sebagai "pembayaran gagal/batal".
 */
const FAILURE_STATUSES = new Set(["expire", "cancel", "deny"]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id: string;
  payment_type: string;
}

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verifikasi keaslian notifikasi dari Midtrans menggunakan SHA512 hash.
 * Format: SHA512(order_id + status_code + gross_amount + server_key)
 */
function verifyMidtransSignature(notification: MidtransNotification): boolean {
  const SERVER_KEY = process.env.NEXT_MIDTRANS_SERVER_KEY;
  if (!SERVER_KEY) return false;

  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${SERVER_KEY}`;
  const expectedHash = crypto.createHash("sha512").update(raw).digest("hex");

  return expectedHash === notification.signature_key;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const notification: MidtransNotification = await request.json();

    const {
      order_id: orderCode, // kita pakai orderCode sebagai Midtrans order_id
      transaction_status,
      transaction_id,
    } = notification;

    // 1. Verifikasi signature Midtrans
    if (!verifyMidtransSignature(notification)) {
      console.warn("[webhook/midtrans] Signature tidak valid untuk order:", orderCode);
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
    }

    // 2. Cari order di database
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: { payments: true, customer: true },
    });

    if (!order) {
      console.warn("[webhook/midtrans] Order tidak ditemukan:", orderCode);
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // 3. Cegah pemrosesan ulang jika order sudah bukan "menunggu_pembayaran"
    if (order.status !== "menunggu_pembayaran") {
      return NextResponse.json({
        success: true,
        message: "Notifikasi diabaikan — status order sudah diproses sebelumnya",
        currentStatus: order.status,
      });
    }

    const payment = order.payments[0];

    // 4. Handle status settlement (pembayaran berhasil)
    if (SETTLEMENT_STATUSES.has(transaction_status)) {
      await prisma.$transaction(async (tx) => {
        // Update status order menjadi "diterima"
        await tx.order.update({
          where: { id: order.id },
          data: { status: "diterima" },
        });

        // Update payment record
        if (payment) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "success",
              paymentGatewayRef: transaction_id,
              paidAt: new Date(),
              webhookPayload: notification as object,
            },
          });
        }

        // Deduct inventory & tambah loyalty stamp
        await deductInventoryAndLoyalty(tx, order.id, order.customerId);

        // Buat E-Nota (catatan nota elektronik)
        await tx.note.create({
          data: {
            orderId: order.id,
            pdfUrl: `/api/orders/${order.id}/note`,
            sentAt: new Date(),
          },
        });
      });

      console.info(`[webhook/midtrans] Pembayaran sukses — Order: ${orderCode}`);

      return NextResponse.json({
        success: true,
        message: "Pembayaran berhasil diverifikasi",
        orderStatus: "diterima",
      });
    }

    // 5. Handle status gagal/expired/dibatalkan
    if (FAILURE_STATUSES.has(transaction_status)) {
      await prisma.$transaction(async (tx) => {
        if (payment) {
          const newPaymentStatus = transaction_status === "expire" ? "expired" : "failed";
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: newPaymentStatus,
              webhookPayload: notification as object,
            },
          });
        }

        // Order tetap "menunggu_pembayaran" — customer bisa coba bayar lagi
        // Atau set ke "dibatalkan" jika bisnis logic menginginkan itu
        // await tx.order.update({ where: { id: order.id }, data: { status: "dibatalkan" } });
      });

      console.info(`[webhook/midtrans] Pembayaran ${transaction_status} — Order: ${orderCode}`);

      return NextResponse.json({
        success: true,
        message: `Pembayaran ${transaction_status} — status payment diperbarui`,
        orderStatus: order.status,
      });
    }

    // 6. Status lain (pending, dll.) — abaikan saja, tidak perlu aksi DB
    return NextResponse.json({
      success: true,
      message: `Notifikasi diterima, status "${transaction_status}" tidak memerlukan aksi`,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[webhook/midtrans] Error:", errMsg);

    return NextResponse.json(
      { error: "Gagal memproses notifikasi Midtrans", details: errMsg },
      { status: 500 }
    );
  }
}
