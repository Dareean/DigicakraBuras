import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET all products for Admin
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil daftar katalog ATK", details: error.message },
      { status: 500 }
    );
  }
}

// POST add new product
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, imageUrl, price, stockQty, category, isActive } = body;

    if (!name || price === undefined || stockQty === undefined || !category) {
      return NextResponse.json({ error: "Kolom nama, harga, stok, dan kategori wajib diisi" }, { status: 400 });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || "",
        imageUrl: imageUrl || "",
        price: Number(price),
        stockQty: Number(stockQty),
        category,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal menambahkan produk baru", details: error.message },
      { status: 500 }
    );
  }
}
