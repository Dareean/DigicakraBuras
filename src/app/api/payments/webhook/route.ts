import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deductInventoryAndLoyalty } from "@/app/api/orders/route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderCode, status } = body;

    if (!orderCode) {
      return NextResponse.json({ error: "orderCode harus dilampirkan" }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        payments: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Only update if current status is "menunggu_pembayaran"
    if (order.status !== "menunggu_pembayaran") {
      return NextResponse.json({
        success: true,
        message: "Status pesanan sudah diperbarui sebelumnya",
        status: order.status,
      });
    }

    const payment = order.payments[0];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update order status to "diterima"
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "diterima",
        },
      });

      // 2. Update payment status to "success"
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            paidAt: new Date(),
            webhookPayload: JSON.stringify(body),
          },
        });
      }

      // 3. Deduct inventory & add stamps
      await deductInventoryAndLoyalty(tx, order.id, order.customerId);

      // 4. Generate E-Nota (Note)
      await tx.note.create({
        data: {
          orderId: order.id,
          pdfUrl: `/api/orders/${order.id}/note`,
          sentAt: new Date(),
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil diverifikasi, stok diperbarui, stempel ditambahkan",
      orderStatus: result.status,
    });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Gagal memproses webhook pembayaran", details: error.message },
      { status: 500 }
    );
  }
}
