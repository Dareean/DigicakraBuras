import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of this month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Today's Revenue
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday },
        status: { notIn: ["menunggu_pembayaran", "dibatalkan"] },
      },
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // 2. Month's Revenue
    const monthOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfThisMonth },
        status: { notIn: ["menunggu_pembayaran", "dibatalkan"] },
      },
    });
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // 3. Active Orders Count
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: { in: ["diterima", "diproses", "siap_diambil"] },
      },
    });

    const inventoryItems = await prisma.inventoryItem.findMany();
    const lowStockInventoryCount = inventoryItems.filter(
      (item) => item.currentQty <= item.minThreshold
    ).length;

    const lowStockProductsCount = await prisma.product.count({
      where: {
        stockQty: { lte: 10 }, // Consider ATK products with stock <= 10 as low
        isActive: true,
      },
    });

    // 5. Weekly Sales Chart Data (Last 7 Days)
    const weeklyChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["menunggu_pembayaran", "dibatalkan"] },
        },
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      const dayNames = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      weeklyChartData.push({
        day: dayNames[startOfDay.getDay()],
        revenue,
      });
    }

    return NextResponse.json({
      todayRevenue,
      monthRevenue,
      activeOrdersCount,
      lowStockItemsCount: lowStockInventoryCount + lowStockProductsCount,
      weeklyChartData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil ringkasan dashboard", details: error.message },
      { status: 500 }
    );
  }
}
