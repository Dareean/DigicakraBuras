import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;
    const body = await request.json();
    const { receiptBase64 } = body;

    if (!receiptBase64) {
      return NextResponse.json({ error: "Bukti pembayaran tidak boleh kosong" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Find existing payment or create one
    const existingPayment = order.payments[0];

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          paymentMethod: "manual_qris",
          paymentGatewayRef: receiptBase64,
          status: "pending",
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: "manual_qris",
          paymentGatewayRef: receiptBase64,
          amount: order.totalAmount,
          status: "pending",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memproses bukti pembayaran", details: error.message },
      { status: 500 }
    );
  }
}
