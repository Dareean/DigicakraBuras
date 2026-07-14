import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const id = Number(orderId);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    let payment = order.payments[0];

    // If payment doesn't exist, create it
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: "qris",
          amount: order.totalAmount,
          status: "pending",
        },
      });
    }

    // Generate mock QRIS payload
    // Standard format for QRIS (EMVCo specification)
    const amountStr = order.totalAmount.toFixed(0);
    const amountLen = String(amountStr.length).padStart(2, "0");
    const mockQrString = `00020101021226300016ID.CO.QRIS.WWW011893600002001234567852045811530336054${amountLen}${amountStr}5802ID5921DIGICAKRA CAKRAWALA6005PALU61059422462070703A016304A67B`;

    // Save qrString to payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        qrString: mockQrString,
      },
    });

    return NextResponse.json({
      orderCode: order.orderCode,
      amount: order.totalAmount,
      status: updatedPayment.status,
      qrString: mockQrString,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memproses QRIS", details: error.message },
      { status: 500 }
    );
  }
}
