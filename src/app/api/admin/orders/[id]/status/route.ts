import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = Number(id);

    const body = await request.json();
    const { status } = body;

    const validStatuses = ["menunggu_pembayaran", "diterima", "diproses", "siap_diambil", "selesai", "dibatalkan"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status tidak valid. Harus salah satu dari: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Update order status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      // If status is updated to completed ("selesai") or ready ("siap_diambil"), and payment is POS/manual, make sure payment success is set
      if (status === "selesai" || status === "siap_diambil") {
        const payment = order.payments[0];
        if (payment && payment.status === "pending") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "success",
              paidAt: new Date(),
              verifiedById: session.userId,
            },
          });
        }
      }

      return ord;
    });

    return NextResponse.json({ success: true, status: updatedOrder.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memperbarui status pesanan", details: error.message },
      { status: 500 }
    );
  }
}
