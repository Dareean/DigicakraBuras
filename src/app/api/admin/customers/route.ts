import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { stamps: { where: { redeemed: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(customers.map((cust) => ({
      id: cust.id,
      name: cust.name,
      whatsappNumber: cust.whatsappNumber,
      totalStamps: cust.totalStamps,
      rewardsEarned: Math.floor(cust.totalStamps / 10),
      rewardsClaimed: cust._count.stamps,
      createdAt: cust.createdAt,
      updatedAt: cust.updatedAt,
      transactionCount: cust.orders.length,
      lastTransactionDate: cust.orders[0]?.createdAt || null,
      orders: cust.orders,
    })));
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil daftar pelanggan", details: error.message },
      { status: 500 }
    );
  }
}
