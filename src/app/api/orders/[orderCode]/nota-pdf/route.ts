import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import { NotaPDF } from "@/components/NotaPDF";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;

    /* ── Ambil data langsung dari database (server-side) ── */
    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        items: { include: { addons: true, product: true } },
        payments: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const payment = order.payments[0];
    const isPaid = payment?.status === "success";

    if (!isPaid) {
      return NextResponse.json(
        { error: "E-Nota hanya tersedia untuk transaksi yang telah lunas." },
        { status: 403 }
      );
    }

    /* ── Hitung nilai di server — tidak bisa dimanipulasi browser ── */
    const ppnRate = 11.0;
    const subtotalBeforeTax = order.totalAmount / (1 + ppnRate / 100);
    const ppnAmount = order.totalAmount - subtotalBeforeTax;
    const receiptNumber = `N-${order.orderCode.split("-")[1] ?? "000"}-${order.id}`;

    const notaProps = {
      receiptNumber,
      orderCode: order.orderCode,
      customerName: order.customer?.name ?? "Pelanggan Toko (Walk-in)",
      customerWhatsApp: order.customer?.whatsappNumber ?? "-",
      createdAt: order.createdAt.toISOString(),
      paymentMethod: payment?.paymentMethod ?? "qris",
      items: order.items.map((item) => ({
        name:
          item.itemType === "atk"
            ? (item.product?.name ?? "Produk ATK")
            : `Layanan Print (${item.itemType})`,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addons: item.addons.map((a) => ({
          type: a.addonType,
          price: a.price,
        })),
      })),
      subtotalBeforeTax,
      ppnRate,
      ppnAmount,
      totalAmount: order.totalAmount,
    };

    /* ── Generate PDF binary di server — tidak ada DOM yang bisa diubah ── */
    const stream = await renderToStream(NotaPDF(notaProps));

    // Kumpulkan stream ke Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        // Buka langsung di browser (bisa langsung Print dari PDF viewer)
        "Content-Disposition": `inline; filename="e-nota-${order.orderCode}.pdf"`,
        // Jangan cache agar selalu ambil data terbaru
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Gagal membuat E-Nota PDF", details: error.message },
      { status: 500 }
    );
  }
}
