import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET all inventory items
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.inventoryItem.findMany({
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 logs
        },
      },
      orderBy: { itemName: "asc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil daftar inventaris", details: error.message },
      { status: 500 }
    );
  }
}
