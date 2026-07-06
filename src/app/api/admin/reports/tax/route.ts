import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Hanya Owner yang diizinkan mengakses laporan keuangan & pajak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "bulanan"; // harian | mingguan | bulanan
    const dateParam = searchParams.get("date"); // e.g. "2026-07" or "2026-07-06"

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === "harian") {
      const targetDate = dateParam ? new Date(dateParam) : now;
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    } else if (period === "mingguan") {
      // Calculate start of week (Monday) and end of week (Sunday)
      const targetDate = dateParam ? new Date(dateParam) : now;
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startDate = new Date(targetDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Bulanan (default)
      const targetDate = dateParam ? new Date(dateParam + "-02") : now; // "-02" to prevent timezone shifting to previous month
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch active PPN & PPh rates
    const ppnSetting = await prisma.taxSettings.findFirst({
      where: { taxType: "ppn", isActive: true },
    });
    const pphSetting = await prisma.taxSettings.findFirst({
      where: { taxType: "pph", isActive: true },
    });

    const ppnRate = ppnSetting ? ppnSetting.ratePercent : 11.0;
    const pphRate = pphSetting ? pphSetting.ratePercent : 0.5;

    // Fetch successful orders in the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ["menunggu_pembayaran", "dibatalkan"] },
      },
      include: {
        customer: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const ppnAmount = totalRevenue * (ppnRate / 100);
    const pphAmount = totalRevenue * (pphRate / 100);

    return NextResponse.json({
      period,
      startDate,
      endDate,
      totalRevenue,
      ppnRate,
      ppnAmount,
      pphRate,
      pphAmount,
      ordersCount: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        orderSource: o.orderSource,
        totalAmount: o.totalAmount,
        status: o.status,
        customerName: o.customer?.name || "Walk-in",
        createdAt: o.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal menghitung laporan pajak", details: error.message },
      { status: 500 }
    );
  }
}
