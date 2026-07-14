import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const itemId = Number(id);

    const body = await request.json();
    const { changeQty, reason } = body;

    if (changeQty === undefined || !reason) {
      return NextResponse.json({ error: "Kolom jumlah perubahan dan alasan wajib diisi" }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: "Bahan operasional tidak ditemukan" }, { status: 404 });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentQty: Math.max(0, item.currentQty + Number(changeQty)),
        },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryItemId: itemId,
          changeQty: Number(changeQty),
          reason: reason || "Penyesuaian manual",
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memperbarui stok inventaris", details: error.message },
      { status: 500 }
    );
  }
}
