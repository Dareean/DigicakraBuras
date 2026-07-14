import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil daftar produk", details: error.message },
      { status: 500 }
    );
  }
}
