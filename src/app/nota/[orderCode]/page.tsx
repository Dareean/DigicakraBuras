import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { generateIntegrityCode } from "@/lib/nota-integrity";
import PrintAutoTrigger from "./PrintAutoTrigger";
import NotaActions from "./NotaActions";

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;

  /* ── Fetch authoritative data from DB (server-side, not from browser DOM) ── */
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

  /* ── Guard: only issue nota for paid orders ── */
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

  /* ── Compute values SERVER-SIDE (cannot be tampered in browser before print) ── */
  const ppnRate = 11.0;
  const subtotalBeforeTax = order.totalAmount / (1 + ppnRate / 100);
  const ppnAmount = order.totalAmount - subtotalBeforeTax;
  const receiptNumber = `N-${order.orderCode.split("-")[1] ?? "000"}-${order.id}`;
  const createdAtStr = new Date(order.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ── HMAC integrity code: encodes real orderCode + totalAmount ── */
  const integrityCode = generateIntegrityCode(order.orderCode, order.totalAmount);

  const fmt = (n: number) =>
    Math.round(n).toLocaleString("id-ID", { minimumFractionDigits: 0 });

  return (
    <html lang="id">
      <head>
        <title>E-Nota {receiptNumber}</title>
        <meta charSet="utf-8" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            background: #f1f5f9;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 24px;
            min-height: 100vh;
          }
          .receipt {
            background: #ffffff;
            width: 100%;
            max-width: 400px;
            padding: 28px 24px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          .header { text-align: center; padding-bottom: 16px; border-bottom: 2px dashed #e2e8f0; margin-bottom: 16px; }
          .header h1 { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 900; color: #dc2626; letter-spacing: 1px; }
          .header p { font-size: 10px; color: #94a3b8; margin-top: 2px; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 10px; }
          .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; margin-top: 14px; }
          .customer-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11px; }
          .customer-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .customer-row:last-child { margin-bottom: 0; }
          .customer-row .label { color: #94a3b8; }
          .customer-row .value { font-weight: 700; color: #1e293b; text-align: right; }
          .divider { border: none; border-top: 1px dashed #e2e8f0; margin: 14px 0; }
          .item { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
          .item:last-child { border-bottom: none; }
          .item-name { font-weight: 700; color: #1e293b; }
          .item-detail { font-size: 9px; color: #94a3b8; margin-top: 2px; }
          .item-price { font-weight: 700; color: #1e293b; text-align: right; flex-shrink: 0; margin-left: 8px; }
          .addon-badge { display: inline-block; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 3px; font-size: 8px; font-weight: 700; padding: 1px 4px; margin-top: 3px; margin-right: 3px; text-transform: uppercase; }
          .totals { font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; color: #64748b; }
          .total-row.grand { font-family: system-ui, sans-serif; font-size: 15px; font-weight: 900; color: #1e293b; border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 10px; }
          .grand .amount { color: #dc2626; }
          .paid-badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 999px; font-size: 9px; font-weight: 900; padding: 3px 12px; letter-spacing: 1px; text-transform: uppercase; }
          .footer { text-align: center; margin-top: 16px; padding-top: 14px; border-top: 2px dashed #e2e8f0; font-size: 9px; color: #94a3b8; line-height: 1.6; }
          .integrity-box {
            margin-top: 14px;
            background: #fffbeb;
            border: 1px dashed #fbbf24;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
          }
          .integrity-label { font-size: 8px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .integrity-code { font-family: 'Courier New', monospace; font-size: 17px; font-weight: 900; color: #b45309; letter-spacing: 4px; margin-top: 2px; }
          .integrity-hint { font-size: 8px; color: #a16207; margin-top: 2px; }
          .no-print { display: block; }

          @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; border: none; max-width: 100%; border-radius: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Auto-trigger print on page load */}
        <PrintAutoTrigger />

        <div className="receipt" id="nota-print-root">
          {/* ── Header ── */}
          <div className="header">
            <h1>FOTOCOPY CAKRAWALA</h1>
            <p>Jalan Banawa No.57, Kota Donggala, Sulawesi Tengah</p>
            <p>WhatsApp: 081234567890</p>
            <div className="meta">
              <span>No: {receiptNumber}</span>
              <span>{createdAtStr}</span>
            </div>
          </div>

          {/* ── Customer Info ── */}
          <div className="section-label">Informasi Pelanggan</div>
          <div className="customer-box">
            <div className="customer-row">
              <span className="label">Pelanggan</span>
              <span className="value">
                {order.customer?.name ?? "Pelanggan Toko (Walk-in)"}
              </span>
            </div>
            <div className="customer-row">
              <span className="label">No WhatsApp</span>
              <span className="value">
                {order.customer?.whatsappNumber ?? "-"}
              </span>
            </div>
            <div className="customer-row">
              <span className="label">Metode Bayar</span>
              <span className="value" style={{ textTransform: "uppercase" }}>
                {payment?.paymentMethod ?? "qris"}
              </span>
            </div>
          </div>

          <hr className="divider" />

          {/* ── Items ── */}
          <div className="section-label">Rincian Item</div>
          {order.items.map((item, idx) => {
            const itemName =
              item.itemType === "atk"
                ? (item.product?.name ?? "Produk ATK")
                : `Layanan Print (${item.itemType})`;
            return (
              <div key={idx} className="item">
                <div style={{ flex: 1 }}>
                  <div className="item-name">{itemName}</div>
                  <div className="item-detail">
                    {item.qty} x Rp {fmt(item.unitPrice)}
                  </div>
                  {item.addons.length > 0 && (
                    <div style={{ marginTop: 3 }}>
                      {item.addons.map((a, ai) => (
                        <span key={ai} className="addon-badge">
                          +{a.addonType} (+Rp {fmt(a.price)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="item-price">Rp {fmt(item.subtotal)}</div>
              </div>
            );
          })}

          <hr className="divider" />

          {/* ── Tax & Total ── */}
          <div className="totals">
            <div className="total-row">
              <span>Subtotal (sebelum PPN)</span>
              <span>Rp {fmt(subtotalBeforeTax)}</span>
            </div>
            <div className="total-row">
              <span>PPN ({ppnRate}%)</span>
              <span>Rp {fmt(ppnAmount)}</span>
            </div>
            <div className="total-row grand">
              <span>Total Pembayaran</span>
              <span className="amount">Rp {fmt(order.totalAmount)}</span>
            </div>
          </div>

          {/* ── Paid badge ── */}
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span className="paid-badge">✓ LUNAS</span>
          </div>

          {/* ── HMAC Integrity Code ── */}
          <div className="integrity-box">
            <div className="integrity-label">Kode Verifikasi Nota</div>
            <div className="integrity-code">{integrityCode}</div>
            <div className="integrity-hint">
              Kode ini diterbitkan server. Konfirmasi ke kasir jika berbeda.
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="footer">
            <p>
              &ldquo;Terima kasih telah mempercayakan dokumen Anda pada
              Fotocopy Cakrawala.&rdquo;
            </p>
            <p style={{ marginTop: 6 }}>
              Kode Pesanan: <strong>{order.orderCode}</strong>
            </p>
          </div>

          {/* ── Print/Close buttons — Client Component (event handlers tidak boleh di Server Component) ── */}
          <NotaActions orderCode={order.orderCode} />
        </div>
      </body>
    </html>
  );
}
