/**
 * NotaPDF — Template PDF yang di-render SERVER-SIDE menggunakan @react-pdf/renderer.
 * Output berupa file binary PDF — tidak ada DOM yang bisa dimanipulasi.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* ── Types ── */
interface NotaItem {
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  addons: { type: string; price: number }[];
}

export interface NotaPDFProps {
  receiptNumber: string;
  orderCode: string;
  customerName: string;
  customerWhatsApp: string;
  createdAt: string;
  paymentMethod: string;
  items: NotaItem[];
  subtotalBeforeTax: number;
  ppnRate: number;
  ppnAmount: number;
  totalAmount: number;
}

/* ── Helpers ── */
const fmt = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

/* ── Styles ── */
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingVertical: 28,
    paddingHorizontal: 28,
    fontSize: 9,
    color: "#1e293b",
  },

  /* Header */
  header: {
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e293b",
    borderStyle: "solid",
  },
  shopName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#dc2626",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  shopAddress: {
    fontSize: 7.5,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  metaText: { fontSize: 7.5, color: "#64748b" },
  metaBold: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#1e293b" },

  /* Section label */
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
    marginTop: 12,
  },

  /* Customer info */
  infoBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2.5,
  },
  infoLabel: { fontSize: 8, color: "#94a3b8", flex: 1 },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#1e293b",
    flex: 2,
    textAlign: "right",
  },

  /* Divider */
  dashedDivider: {
    borderTopWidth: 0.75,
    borderTopColor: "#cbd5e1",
    borderStyle: "dashed",
    marginVertical: 10,
  },
  solidDivider: {
    borderTopWidth: 0.75,
    borderTopColor: "#1e293b",
    borderStyle: "solid",
    marginVertical: 10,
  },

  /* Items */
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    borderStyle: "solid",
  },
  itemLeft: { flex: 1, paddingRight: 6 },
  itemName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#1e293b",
    marginBottom: 1.5,
    flexWrap: "wrap",
  },
  itemDetail: { fontSize: 7.5, color: "#94a3b8" },
  itemPrice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#1e293b",
    textAlign: "right",
    minWidth: 60,
  },
  addonText: {
    fontSize: 7,
    color: "#dc2626",
    marginTop: 2,
  },

  /* Totals */
  totalsBox: {
    marginTop: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  totalLabel: { fontSize: 8.5, color: "#475569" },
  totalValue: { fontSize: 8.5, color: "#475569" },
  grandRow: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 4,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#fecaca",
  },
  grandLabel: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  grandAmount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },

  /* Paid badge */
  paidWrapper: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  paidBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 0.75,
    borderColor: "#6ee7b7",
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  paidText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  /* Footer */
  footer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.75,
    borderTopColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
  },
  footerQuote: {
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  footerCode: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 5,
    textAlign: "center",
  },
});

/* ── Main PDF Component ── */
export function NotaPDF(props: NotaPDFProps) {
  const {
    receiptNumber,
    orderCode,
    customerName,
    customerWhatsApp,
    createdAt,
    paymentMethod,
    items,
    subtotalBeforeTax,
    ppnRate,
    ppnAmount,
    totalAmount,
  } = props;

  return (
    <Document
      title={`E-Nota ${receiptNumber}`}
      author="Fotocopy Cakrawala"
      subject="Electronic Receipt"
      creator="DigicakraBuras System"
    >
      <Page
        size={{ width: 255, height: "auto" as any }}
        style={s.page}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.shopName}>Fotocopy Cakrawala</Text>
          <Text style={s.shopAddress}>
            Jalan Banawa No.57, Kota Donggala, Sulawesi Tengah
          </Text>
          <Text style={s.shopAddress}>WA: 081234567890</Text>
          <View style={s.metaRow}>
            <Text style={s.metaText}>
              No. <Text style={s.metaBold}>{receiptNumber}</Text>
            </Text>
            <Text style={s.metaText}>{formatDate(createdAt)}</Text>
          </View>
        </View>

        {/* ── Customer Info ── */}
        <Text style={s.sectionLabel}>Informasi Pelanggan</Text>
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Nama</Text>
            <Text style={s.infoValue}>{customerName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>WhatsApp</Text>
            <Text style={s.infoValue}>{customerWhatsApp}</Text>
          </View>
          <View style={[s.infoRow, { paddingBottom: 0 }]}>
            <Text style={s.infoLabel}>Metode Bayar</Text>
            <Text style={[s.infoValue, { textTransform: "uppercase" }]}>
              {paymentMethod}
            </Text>
          </View>
        </View>

        <View style={s.dashedDivider} />

        {/* ── Items ── */}
        <Text style={s.sectionLabel}>Rincian Item</Text>
        {items.map((item, i) => (
          <View key={i} style={s.itemRow}>
            <View style={s.itemLeft}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemDetail}>
                {item.qty} x {fmt(item.unitPrice)}
              </Text>
              {item.addons.map((a, ai) => (
                <Text key={ai} style={s.addonText}>
                  + {a.type.toUpperCase()} (+{fmt(a.price)})
                </Text>
              ))}
            </View>
            <Text style={s.itemPrice}>{fmt(item.subtotal)}</Text>
          </View>
        ))}

        <View style={s.dashedDivider} />

        {/* ── Tax & Total ── */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal (sebelum PPN)</Text>
            <Text style={s.totalValue}>{fmt(subtotalBeforeTax)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>PPN ({ppnRate}%)</Text>
            <Text style={s.totalValue}>{fmt(ppnAmount)}</Text>
          </View>
        </View>

        {/* Grand Total box */}
        <View style={s.grandRow}>
          <Text style={s.grandLabel}>Total Pembayaran</Text>
          <Text style={s.grandAmount}>{fmt(totalAmount)}</Text>
        </View>

        {/* ── Paid Badge ── */}
        <View style={s.paidWrapper}>
          <View style={s.paidBadge}>
            <Text style={s.paidText}>✓  Lunas</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerQuote}>
            "Terima kasih telah mempercayakan dokumen Anda{"\n"}
            kepada Fotocopy Cakrawala."
          </Text>
          <Text style={s.footerCode}>Kode Pesanan: {orderCode}</Text>
        </View>
      </Page>
    </Document>
  );
}
