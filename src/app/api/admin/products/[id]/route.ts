import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PUT edit product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);

    const body = await request.json();
    const { name, description, imageUrl, price, stockQty, category, isActive } = body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    let updateData: any = {};

    if (session.role === "staff") {
      // Staff can ONLY update stockQty
      if (stockQty === undefined) {
        return NextResponse.json({ error: "Sebagai staff, Anda hanya diperbolehkan memperbarui jumlah stok" }, { status: 403 });
      }
      updateData = { stockQty: Number(stockQty) };
    } else {
      // Owner can update everything
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (price !== undefined) updateData.price = Number(price);
      if (stockQty !== undefined) updateData.stockQty = Number(stockQty);
      if (category !== undefined) updateData.category = category;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memperbarui produk", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE delete product (Owner only!)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang diperbolehkan menghapus produk dari katalog" }, { status: 403 });
    }

    const { id } = await params;
    const productId = Number(id);

    // Instead of hard deleting, we toggle isActive to false so existing order references don't break
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Produk dinonaktifkan dari katalog" });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal menghapus produk", details: error.message },
      { status: 500 }
    );
  }
}
