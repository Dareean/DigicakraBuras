import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        items: {
          include: {
            addons: true,
            product: true,
          },
        },
        payments: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      orderCode: order.orderCode,
      orderSource: order.orderSource,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      pickupNote: order.pickupNote,
      createdAt: order.createdAt,
      customer: order.customer ? {
        name: order.customer.name,
        whatsappNumber: order.customer.whatsappNumber,
        totalStamps: order.customer.totalStamps,
      } : null,
      items: order.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        productId: item.productId,
        productName: item.product?.name || null,
        fileUrl: item.fileUrl,
        spec: JSON.parse(item.specJson || "{}"),
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addons: item.addons,
      })),
      payment: order.payments[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil detail pesanan", details: error.message },
      { status: 500 }
    );
  }
}
