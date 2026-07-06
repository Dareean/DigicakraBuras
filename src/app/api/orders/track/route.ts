import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get("whatsapp");

    if (!whatsapp) {
      return NextResponse.json({ error: "Nomor WhatsApp harus diisi" }, { status: 400 });
    }

    const cleanWa = whatsapp.trim();

    // Find the customer
    const customer = await prisma.customer.findUnique({
      where: { whatsappNumber: cleanWa },
    });

    if (!customer) {
      // Return empty list if customer does not exist yet
      return NextResponse.json({
        customer: null,
        orders: [],
      });
    }

    // Get all orders for this customer
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            addons: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customer: {
        name: customer.name,
        whatsappNumber: customer.whatsappNumber,
        totalStamps: customer.totalStamps,
      },
      orders: orders.map((order) => ({
        id: order.id,
        orderCode: order.orderCode,
        orderSource: order.orderSource,
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount,
        pickupNote: order.pickupNote,
        createdAt: order.createdAt,
        items: order.items,
        payment: order.payments[0] || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal melacak pesanan", details: error.message },
      { status: 500 }
    );
  }
}
