import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const whereClause: any = {};

    if (status && status !== "all") {
      whereClause.status = status;
    }
    
    if (source && source !== "all") {
      whereClause.orderSource = source;
    }

    if (search) {
      whereClause.OR = [
        { orderCode: { contains: search } },
        { pickupNote: { contains: search } },
        {
          customer: {
            OR: [
              { name: { contains: search } },
              { whatsappNumber: { contains: search } },
            ],
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            addons: true,
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders.map((order) => ({
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
        spec: item.specJson || {},
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addons: item.addons,
      })),
      payment: order.payments[0] || null,
    })));
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil daftar pesanan", details: error.message },
      { status: 500 }
    );
  }
}
