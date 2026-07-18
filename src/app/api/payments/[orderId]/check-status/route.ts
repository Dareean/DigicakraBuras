/**
 * @file src/app/api/payments/[orderId]/check-status/route.ts
 * @description Cek & sinkronisasi status pembayaran dari Midtrans secara aktif.
 *
 * Endpoint ini menggantikan kebutuhan webhook saat development lokal.
 * Checkout page memanggil endpoint ini setiap beberapa detik (polling).
 *
 * Flow:
 *  1. Ambil payment record dari DB untuk mendapatkan transaction_id Midtrans
 *  2. Query status transaksi langsung ke Midtrans Get Status API
 *  3. Jika sudah "settlement" → update DB (order + payment + inventory + stamp)
 *  4. Return status terbaru ke frontend
 *
 * Catatan: Webhook Midtrans (/api/payments/webhook/midtrans) tetap bisa
 * didaftarkan di production sebagai lapisan kedua keamanan, tapi bukan syarat
 * agar sistem berfungsi.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import { deductInventoryAndLoyalty } from "@/app/api/orders/route";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Status Midtrans yang berarti pembayaran berhasil */
const SETTLEMENT_STATUSES = new Set(["settlement", "capture"]);

/** Status Midtrans yang berarti pembayaran gagal/kedaluwarsa */
const FAILURE_STATUSES = new Set(["expire", "cancel", "deny"]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MidtransStatusResponse {
  transaction_id: string;
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
  payment_type: string;
  status_code: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const id = Number(orderId);

    // 1. Ambil order + payment dari DB
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: true, customer: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const payment = order.payments[0];

    // 2. Jika sudah lunas di DB, tidak perlu query ke Midtrans lagi
    if (order.status !== "menunggu_pembayaran") {
      return NextResponse.json({
        orderStatus: order.status,
        paymentStatus: payment?.status ?? "unknown",
        synced: false, // tidak ada perubahan baru
      });
    }

    // 3. Jika belum ada transaction ID Midtrans, QR belum di-generate
    if (!payment?.paymentGatewayRef) {
      return NextResponse.json({
        orderStatus: order.status,
        paymentStatus: "pending",
        synced: false,
      });
    }

    // 4. Query status transaksi ke Midtrans
    const midtransStatus = (await (coreApi as any).transaction.status(
      payment.paymentGatewayRef
    )) as MidtransStatusResponse;

    const { transaction_status } = midtransStatus;

    // 5. Handle settlement — sinkronisasi ke DB
    if (SETTLEMENT_STATUSES.has(transaction_status)) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "diterima" },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            paidAt: new Date(),
            webhookPayload: midtransStatus as object,
          },
        });

        await deductInventoryAndLoyalty(tx, order.id, order.customerId);

        // Buat E-Nota jika belum ada
        const existingNote = await tx.note.findFirst({
          where: { orderId: order.id },
        });
        if (!existingNote) {
          await tx.note.create({
            data: {
              orderId: order.id,
              pdfUrl: `/api/orders/${order.id}/note`,
              sentAt: new Date(),
            },
          });
        }
      });

      console.info(
        `[check-status] Settlement dikonfirmasi — Order: ${order.orderCode}`
      );

      return NextResponse.json({
        orderStatus: "diterima",
        paymentStatus: "success",
        synced: true, // ada perubahan baru
      });
    }

    // 6. Handle gagal/kedaluwarsa — update payment status saja
    if (FAILURE_STATUSES.has(transaction_status)) {
      const newPaymentStatus =
        transaction_status === "expire" ? "expired" : "failed";

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newPaymentStatus,
          webhookPayload: midtransStatus as object,
        },
      });

      return NextResponse.json({
        orderStatus: order.status,
        paymentStatus: newPaymentStatus,
        synced: true,
      });
    }

    // 7. Status lain (pending, dll.) — belum ada perubahan
    return NextResponse.json({
      orderStatus: order.status,
      paymentStatus: payment.status,
      synced: false,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[check-status] Error:", errMsg);

    return NextResponse.json(
      { error: "Gagal memeriksa status pembayaran", details: errMsg },
      { status: 500 }
    );
  }
}
