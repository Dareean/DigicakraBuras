import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateIntegrityCode } from "@/lib/nota-integrity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        items: {
          include: {
            addons: true,
            product: true,
          },
        },
        payments: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "E-Nota tidak ditemukan" }, { status: 404 });
    }

    const isPaid = order.payments[0]?.status === "success";

    // Guard: e-nota hanya tersedia untuk order yang sudah lunas
    if (!isPaid) {
      return NextResponse.json(
        { error: "E-Nota hanya tersedia untuk transaksi yang telah lunas." },
        { status: 403 }
      );
    }

    const ppnRate = 11.0; // Default PPN
    const subtotalAmount = order.totalAmount / (1 + ppnRate / 100);
    const ppnAmount = order.totalAmount - subtotalAmount;
    const integrityCode = generateIntegrityCode(order.orderCode, order.totalAmount);

    return NextResponse.json({
      receiptNumber: `N-${order.orderCode.split("-")[1] || "000"}-${order.id}`,
      orderCode: order.orderCode,
      customerName: order.customer?.name || "Pelanggan Toko (Walk-in)",
      customerWhatsApp: order.customer?.whatsappNumber || "-",
      createdAt: order.createdAt,
      orderSource: order.orderSource,
      isPaid,
      paymentMethod: order.payments[0]?.paymentMethod || "qris",
      integrityCode, // Kode HMAC untuk verifikasi keaslian nota
      items: order.items.map((item) => ({
        name: item.itemType === "atk" ? (item.product?.name || "Produk ATK") : `Layanan Print (${item.itemType})`,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addons: item.addons.map((a) => ({
          type: a.addonType,
          price: a.price,
        })),
      })),
      taxDetails: {
        subtotal: subtotalAmount,
        ppnRate,
        ppnAmount,
      },
      totalAmount: order.totalAmount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memproses data E-Nota", details: error.message },
      { status: 500 }
    );
  }
}
