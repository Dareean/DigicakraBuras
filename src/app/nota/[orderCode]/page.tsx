import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;

  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: {
      items: { include: { addons: true, product: true } },
      payments: true,
      customer: true,
    },
  });

  if (!order) notFound();

  const payment = order.payments[0];
  const isPaid = payment?.status === "success";

  if (!isPaid) {
    return (
      <html lang="id">
        <body
          style={{
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            margin: 0,
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #fca5a5",
              borderRadius: 12,
              padding: "40px 48px",
              textAlign: "center",
              maxWidth: 400,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <h2 style={{ color: "#dc2626", margin: "0 0 8px" }}>
              E-Nota Tidak Tersedia
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              Pesanan <strong>{orderCode}</strong> belum dikonfirmasi
              pembayarannya. E-Nota hanya tersedia untuk transaksi yang telah
              lunas.
            </p>
          </div>
        </body>
      </html>
    );
  }

  redirect(`/api/orders/${order.orderCode}/nota-pdf`);

  return null;
}
