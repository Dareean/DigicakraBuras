/**
 * @file src/app/api/payments/[orderId]/generate-qr/route.ts
 * @description Generate QRIS via Midtrans Core API.
 *
 * Flow:
 *  1. Validasi order & payment record
 *  2. Charge ke Midtrans dengan payment_type = "qris"
 *  3. Ambil QR code URL dari response Midtrans
 *  4. Simpan transaction ID & QR URL ke tabel Payment
 *  5. Return ke frontend untuk ditampilkan
 *
 * Catatan: Jika payment sudah ada (idempotent), kembalikan data existing
 * agar tidak charge ulang ke Midtrans.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoreApi } from "@/lib/midtrans";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Acquirer QRIS yang dipakai. Opsi: "gopay" | "airpay shopee" */
const QRIS_ACQUIRER = "gopay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MidtransQrisAction {
  name: string;
  method: string;
  url: string;
}

interface MidtransChargeResponse {
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  transaction_status: string;
  transaction_time: string;
  actions: MidtransQrisAction[];
  qr_string?: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const id = Number(orderId);

    // 1. Ambil order beserta payment yang sudah ada (jika ada)
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const existingPayment = order.payments[0];

    // 2. Idempotent check — jika QR sudah pernah di-generate, kembalikan yang ada
    if (existingPayment?.qrString && existingPayment.status === "pending") {
      return NextResponse.json({
        orderCode: order.orderCode,
        amount: order.totalAmount,
        qrCodeUrl: existingPayment.qrString,
        transactionId: existingPayment.paymentGatewayRef,
        status: existingPayment.status,
      });
    }

    // 3. Buat payment record jika belum ada
    const paymentRecord =
      existingPayment ??
      (await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: "qris",
          amount: order.totalAmount,
          status: "pending",
        },
      }));

    // 4. Charge ke Midtrans Core API
    const chargePayload = {
      payment_type: "qris",
      transaction_details: {
        order_id: order.orderCode, // Pakai orderCode agar mudah diidentifikasi di dashboard Midtrans
        gross_amount: Math.round(order.totalAmount),
      },
      qris: {
        acquirer: QRIS_ACQUIRER,
      },
    };

    const midtransResponse =
      (await (await getCoreApi()).charge(chargePayload)) as MidtransChargeResponse;

    // 5. Ekstrak QR code URL dari response Midtrans
    const qrAction = midtransResponse.actions?.find(
      (a) => a.name === "generate-qr-code"
    );
    const qrCodeUrl = qrAction?.url ?? null;

    if (!qrCodeUrl) {
      console.error("[generate-qr] Midtrans tidak mengembalikan QR code URL:", midtransResponse);
      return NextResponse.json(
        { error: "Gagal mendapatkan QR code dari Midtrans" },
        { status: 502 }
      );
    }

    // 6. Simpan transaction ID & QR URL ke payment record
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        paymentGatewayRef: midtransResponse.transaction_id,
        qrString: qrCodeUrl, // Simpan URL langsung (bukan raw string) agar mudah dipakai di <img>
      },
    });

    return NextResponse.json({
      orderCode: order.orderCode,
      amount: order.totalAmount,
      qrCodeUrl,
      transactionId: midtransResponse.transaction_id,
      status: "pending",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[generate-qr] Error:", errMsg);

    return NextResponse.json(
      { error: "Gagal memproses QRIS", details: errMsg },
      { status: 500 }
    );
  }
}
