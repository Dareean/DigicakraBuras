import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";
import { title, subtitle, sectionHeader, label, value, currency, thCell, tdCell, footerCell, border, RED, GREEN, DARK, WHITE } from "./xlsxStyles";

const LAYANAN: Record<string, string> = {
  print_doc: "Print Dokumen", fotokopi: "Fotokopi",
  pas_foto: "Pas Foto", undangan: "Undangan", atk: "ATK",
};
const STATUS: Record<string, string> = {
  selesai: "Lunas", diproses: "Diproses",
  diterima: "Diterima", siap_diambil: "Siap Ambil",
};

function mergeTitleRow(ws: ExcelJS.Worksheet, text: string, lastCol: string, height = 26) {
  const rn = ws.rowCount + 1;
  const r = ws.addRow([text]);
  ws.mergeCells(`A${rn}:${lastCol}${rn}`);
  title(r.getCell(1)); r.height = height; return r;
}
function addKV(ws: ExcelJS.Worksheet, lbl: string, val: string | number, isCurrency = false) {
  const r = ws.addRow([lbl, val]); r.height = 19;
  label(r.getCell(1));
  if (isCurrency) { currency(r.getCell(2), true, RED); }
  else { value(r.getCell(2), true); }
}
function addSecHead(ws: ExcelJS.Worksheet, text: string, lastCol: string) {
  const rn = ws.rowCount + 1;
  const r = ws.addRow([text]);
  ws.mergeCells(`A${rn}:${lastCol}${rn}`);
  sectionHeader(r.getCell(1)); r.height = 20; return r;
}
function addHeaders(ws: ExcelJS.Worksheet, headers: string[]) {
  const r = ws.addRow(headers); r.height = 22;
  headers.forEach((_, i) => thCell(r.getCell(i + 1))); return r;
}
function addFooterRow(ws: ExcelJS.Worksheet, cols: number, labelCol: number, vals: (string | number)[]) {
  const r = ws.addRow(vals); r.height = 20;
  for (let c = 1; c <= cols; c++) {
    footerCell(r.getCell(c), c !== labelCol);
    if (c === labelCol) r.getCell(c).alignment = { horizontal: "right", vertical: "middle" };
  }
  return r;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "bulanan";
    const dateParam = searchParams.get("date");
    const now = new Date();
    let startDate = new Date(), endDate = new Date();

    if (period === "harian") {
      const t = dateParam ? new Date(dateParam) : now;
      startDate = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      endDate = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    } else if (period === "mingguan") {
      const t = dateParam ? new Date(dateParam) : now;
      const day = t.getDay(), diff = t.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(t.setDate(diff)); startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999);
    } else {
      const t = dateParam ? new Date(dateParam + "-02") : now;
      startDate = new Date(t.getFullYear(), t.getMonth(), 1);
      endDate = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [ppnSetting, pphSetting] = await Promise.all([
      prisma.taxSettings.findFirst({ where: { taxType: "ppn", isActive: true } }),
      prisma.taxSettings.findFirst({ where: { taxType: "pph", isActive: true } }),
    ]);
    const ppnRate = Number(ppnSetting?.ratePercent ?? 11);
    const pphRate = Number(pphSetting?.ratePercent ?? 0.5);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: { notIn: ["menunggu_pembayaran", "dibatalkan"] } },
      include: { customer: true, items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: "asc" },
    });

    const allPayments = orders.flatMap(o => o.payments).filter(p => p.status === "success");
    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const qrisPay = allPayments.filter(p => p.paymentMethod === "qris");
    const cashPay = allPayments.filter(p => p.paymentMethod === "cash");
    const ppnAmount = totalRevenue * ppnRate / 100;
    const pphAmount = totalRevenue * pphRate / 100;

    const fmtDate = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const fmtShort = (d: Date) => d.toLocaleDateString("id-ID");
    const periodLabel = period === "harian" ? fmtDate(startDate)
      : period === "mingguan" ? `${fmtDate(startDate)} - ${fmtDate(endDate)}`
      : startDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    const wb = new ExcelJS.Workbook();
    wb.creator = "DIGICAKRA – Fotocopy Cakrawala"; wb.created = new Date();

    // SHEET 1
    const ws1 = wb.addWorksheet("Ringkasan Laporan");
    ws1.columns = [{ width: 36 }, { width: 30 }];
    mergeTitleRow(ws1, "LAPORAN PAJAK & KEUANGAN", "B", 30);
    const s1b = ws1.addRow(["Fotocopy Cakrawala – DIGICAKRA Admin System"]);
    ws1.mergeCells(`A${s1b.number}:B${s1b.number}`); subtitle(s1b.getCell(1)); s1b.height = 18;
    ws1.addRow([]);
    addSecHead(ws1, "INFORMASI UMKM", "B");
    addKV(ws1, "Nama UMKM", "Fotocopy Cakrawala");
    addKV(ws1, "Periode Laporan", periodLabel);
    addKV(ws1, "Tanggal Export", fmtDate(new Date()));
    addKV(ws1, "Diekspor Oleh", session.name);
    ws1.addRow([]);
    addSecHead(ws1, "RINGKASAN PENJUALAN", "B");
    addKV(ws1, "Total Transaksi", orders.length);
    addKV(ws1, "Total Order Online", orders.filter(o => o.orderSource === "online").length);
    addKV(ws1, "Total Order POS / Kasir", orders.filter(o => o.orderSource === "pos").length);
    addKV(ws1, "Total Pembayaran QRIS", qrisPay.length);
    addKV(ws1, "Total Pembayaran Tunai", cashPay.length);
    addKV(ws1, "Total Omzet Kotor", totalRevenue, true);
    addKV(ws1, "Total via QRIS", qrisPay.reduce((s, p) => s + Number(p.amount), 0), true);
    addKV(ws1, "Total via Tunai", cashPay.reduce((s, p) => s + Number(p.amount), 0), true);
    ws1.addRow([]);
    addSecHead(ws1, "RINGKASAN PAJAK (ESTIMASI)", "B");
    addKV(ws1, "Tarif PPN", `${ppnRate}%`);
    addKV(ws1, "Estimasi PPN", ppnAmount, true);
    addKV(ws1, "Tarif PPh Final UMKM", `${pphRate}%`);
    addKV(ws1, "Estimasi PPh", pphAmount, true);
    ws1.addRow([]);
    const dRow = ws1.addRow(["Catatan: Estimasi pajak adalah alat bantu administrasi internal dan bukan perhitungan pajak resmi."]);
    ws1.mergeCells(`A${dRow.number}:B${dRow.number}`);
    dRow.getCell(1).font = { italic: true, size: 8, color: { argb: "FF94A3B8" } };
    dRow.getCell(1).alignment = { wrapText: true }; dRow.height = 30;

    // SHEET 2
    const ws2 = wb.addWorksheet("Detail Transaksi");
    ws2.columns = [{width:5},{width:14},{width:18},{width:10},{width:22},{width:22},{width:16},{width:16},{width:14},{width:16}];
    mergeTitleRow(ws2, "DETAIL TRANSAKSI – " + periodLabel, "J");
    const s2b = ws2.addRow([`Periode: ${fmtShort(startDate)} s.d. ${fmtShort(endDate)}`]);
    ws2.mergeCells(`A${s2b.number}:J${s2b.number}`); subtitle(s2b.getCell(1)); s2b.height = 18;
    ws2.addRow([]);
    addHeaders(ws2, ["No","Tanggal","No. Order","Sumber","Pelanggan","Jenis Layanan","Metode Bayar","Total (Rp)","Status Bayar","Status Order"]);
    orders.forEach((o, idx) => {
      const alt = idx % 2 === 1;
      const pay = o.payments.find(p => p.status === "success");
      const method = pay ? (pay.paymentMethod === "qris" ? "QRIS" : pay.paymentMethod === "cash" ? "Tunai" : pay.paymentMethod) : "-";
      const types = [...new Set(o.items.map(i => LAYANAN[i.itemType] || i.itemType))].join(", ") || o.orderType;
      const r = ws2.addRow([idx+1, fmtShort(new Date(o.createdAt)), o.orderCode, o.orderSource === "pos" ? "POS" : "Online",
        o.customer?.name || "Walk-in", types, method, Number(o.totalAmount), pay ? "Lunas" : "Belum", STATUS[o.status] || o.status]);
      r.height = 19;
      [1,2,3,4].forEach(c => tdCell(r.getCell(c), "center", alt));
      [5,6].forEach(c => tdCell(r.getCell(c), "left", alt));
      tdCell(r.getCell(7), "center", alt);
      const vc = r.getCell(8); tdCell(vc, "right", alt, true); vc.numFmt = '"Rp"#,##0';
      [9,10].forEach(c => tdCell(r.getCell(c), "center", alt));
    });
    ws2.addRow([]);
    const fr2 = ws2.addRow(["","","","","","","TOTAL OMZET", totalRevenue,"",""]);
    for (let c = 1; c <= 10; c++) {
      const cell = fr2.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.font = { bold: true, size: 9, color: { argb: WHITE } }; border(cell);
    }
    fr2.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    fr2.getCell(8).numFmt = '"Rp"#,##0'; fr2.height = 20;

    // SHEET 3
    const ws3 = wb.addWorksheet("Rekap Harian");
    ws3.columns = [{width:18},{width:16},{width:16},{width:16},{width:22}];
    mergeTitleRow(ws3, "REKAP PENJUALAN HARIAN – " + periodLabel, "E");
    ws3.addRow([]);
    addHeaders(ws3, ["Tanggal","Jumlah Order","QRIS","Tunai","Omzet (Rp)"]);
    const dailyMap = new Map<string, { count: number; qris: number; cash: number; omzet: number }>();
    orders.forEach(o => {
      const key = fmtShort(new Date(o.createdAt));
      if (!dailyMap.has(key)) dailyMap.set(key, { count: 0, qris: 0, cash: 0, omzet: 0 });
      const d = dailyMap.get(key)!; d.count++; d.omzet += Number(o.totalAmount);
      o.payments.filter(p => p.status === "success").forEach(p => {
        if (p.paymentMethod === "qris") d.qris++; else if (p.paymentMethod === "cash") d.cash++;
      });
    });
    let d3i = 0;
    dailyMap.forEach((d, key) => {
      const alt = d3i++ % 2 === 1;
      const r = ws3.addRow([key, d.count, d.qris, d.cash, d.omzet]); r.height = 19;
      [1,2,3,4].forEach(c => tdCell(r.getCell(c), "center", alt));
      const vc = r.getCell(5); tdCell(vc, "right", alt, true); vc.numFmt = '"Rp"#,##0';
    });
    addFooterRow(ws3, 5, 5, ["TOTAL", [...dailyMap.values()].reduce((s,d)=>s+d.count,0),
      qrisPay.length, cashPay.length, totalRevenue]);

    // SHEET 4
    const ws4 = wb.addWorksheet("Rekap Layanan");
    ws4.columns = [{width:24},{width:22},{width:26}];
    mergeTitleRow(ws4, "REKAP PER JENIS LAYANAN – " + periodLabel, "C");
    ws4.addRow([]);
    addHeaders(ws4, ["Jenis Layanan","Jumlah Transaksi","Total Pendapatan (Rp)"]);
    const svcMap = new Map<string, { count: number; total: number }>();
    orders.forEach(o => o.items.forEach(i => {
      const svc = LAYANAN[i.itemType] || i.itemType;
      if (!svcMap.has(svc)) svcMap.set(svc, { count: 0, total: 0 });
      const s = svcMap.get(svc)!; s.count++; s.total += Number(i.subtotal);
    }));
    let s4i = 0;
    svcMap.forEach((s, svc) => {
      const alt = s4i++ % 2 === 1;
      const r = ws4.addRow([svc, s.count, s.total]); r.height = 19;
      tdCell(r.getCell(1), "left", alt); tdCell(r.getCell(2), "center", alt);
      const vc = r.getCell(3); tdCell(vc, "right", alt, true); vc.numFmt = '"Rp"#,##0';
    });
    const sv = [...svcMap.values()];
    addFooterRow(ws4, 3, 3, ["TOTAL", sv.reduce((s,v)=>s+v.count,0), sv.reduce((s,v)=>s+v.total,0)]);

    // SHEET 5
    const ws5 = wb.addWorksheet("Rekap Metode Bayar");
    ws5.columns = [{width:22},{width:22},{width:24}];
    mergeTitleRow(ws5, "REKAP METODE PEMBAYARAN – " + periodLabel, "C");
    ws5.addRow([]);
    addHeaders(ws5, ["Metode Pembayaran","Jumlah Transaksi","Total (Rp)"]);
    const payMap = new Map<string, { count: number; total: number }>();
    allPayments.forEach(p => {
      const m = p.paymentMethod === "qris" ? "QRIS" : p.paymentMethod === "cash" ? "Tunai" : "Lainnya";
      if (!payMap.has(m)) payMap.set(m, { count: 0, total: 0 });
      const pm = payMap.get(m)!; pm.count++; pm.total += Number(p.amount);
    });
    let pm5i = 0;
    payMap.forEach((pm, m) => {
      const alt = pm5i++ % 2 === 1;
      const r = ws5.addRow([m, pm.count, pm.total]); r.height = 19;
      tdCell(r.getCell(1), "left", alt); tdCell(r.getCell(2), "center", alt);
      const vc = r.getCell(3); tdCell(vc, "right", alt, true); vc.numFmt = '"Rp"#,##0';
    });
    const pv = [...payMap.values()];
    addFooterRow(ws5, 3, 3, ["TOTAL", pv.reduce((s,v)=>s+v.count,0), pv.reduce((s,v)=>s+v.total,0)]);

    // SHEET 6
    const ws6 = wb.addWorksheet("Rekap Administrasi Pajak");
    ws6.columns = [{width:20},{width:22},{width:14},{width:24},{width:14},{width:24}];
    mergeTitleRow(ws6, "REKAP ADMINISTRASI PAJAK – " + periodLabel, "F");
    ws6.addRow([]);
    addHeaders(ws6, ["Periode","Omzet Bersih (Rp)","Tarif PPN","Estimasi PPN (Rp)","Tarif PPh","Estimasi PPh (Rp)"]);
    const r6d = ws6.addRow([periodLabel, totalRevenue, `${ppnRate}%`, ppnAmount, `${pphRate}%`, pphAmount]); r6d.height = 22;
    tdCell(r6d.getCell(1), "center");
    [2, 4, 6].forEach(c => { const vc = r6d.getCell(c); tdCell(vc, "right", false, true, RED); vc.numFmt = '"Rp"#,##0'; });
    [3, 5].forEach(c => tdCell(r6d.getCell(c), "center", false, true));
    ws6.addRow([]); ws6.addRow([]);
    const cn6 = ws6.addRow(["Catatan:"]); ws6.mergeCells(`A${cn6.number}:F${cn6.number}`);
    cn6.getCell(1).font = { bold: true, size: 9, color: { argb: DARK } };
    ["Laporan ini dibuat secara otomatis oleh DIGICAKRA berdasarkan transaksi yang tercatat pada sistem.",
     "Nilai estimasi pajak merupakan alat bantu administrasi internal dan bukan perhitungan resmi perpajakan."]
    .forEach(note => {
      const r = ws6.addRow([note]); ws6.mergeCells(`A${r.number}:F${r.number}`);
      r.getCell(1).font = { italic: true, size: 8, color: { argb: "FF94A3B8" } };
      r.getCell(1).alignment = { wrapText: true }; r.height = 24;
    });

    // SHEET 7
    const ws7 = wb.addWorksheet("Rekap Produk ATK");
    ws7.columns = [{width:28},{width:18},{width:24}];
    mergeTitleRow(ws7, "REKAP PRODUK ATK – " + periodLabel, "C");
    ws7.addRow([]);
    addHeaders(ws7, ["Nama Produk","Jumlah Terjual","Total Pendapatan (Rp)"]);
    const atkMap = new Map<string, { qty: number; total: number }>();
    orders.forEach(o => o.items.filter(i => i.itemType === "atk" && i.product).forEach(i => {
      const name = i.product!.name;
      if (!atkMap.has(name)) atkMap.set(name, { qty: 0, total: 0 });
      const a = atkMap.get(name)!; a.qty += i.qty; a.total += Number(i.subtotal);
    }));
    if (atkMap.size === 0) {
      const er = ws7.addRow(["Tidak ada penjualan produk ATK pada periode ini."]);
      ws7.mergeCells(`A${er.number}:C${er.number}`);
      er.getCell(1).font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };
      er.getCell(1).alignment = { horizontal: "center" }; er.height = 24;
    } else {
      let a7i = 0;
      atkMap.forEach((a, name) => {
        const alt = a7i++ % 2 === 1;
        const r = ws7.addRow([name, a.qty, a.total]); r.height = 19;
        tdCell(r.getCell(1), "left", alt); tdCell(r.getCell(2), "center", alt);
        const vc = r.getCell(3); tdCell(vc, "right", alt, true); vc.numFmt = '"Rp"#,##0';
      });
      const av = [...atkMap.values()];
      addFooterRow(ws7, 3, 3, ["TOTAL", av.reduce((s,v)=>s+v.qty,0), av.reduce((s,v)=>s+v.total,0)]);
    }

    const buf = await wb.xlsx.writeBuffer();
    const slug = period === "harian" ? `harian_${startDate.toISOString().slice(0,10)}`
      : period === "mingguan" ? `minggu_${startDate.toISOString().slice(0,10)}`
      : `bulan_${startDate.toISOString().slice(0,7)}`;

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan_pajak_${slug}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal membuat file Excel", details: error.message }, { status: 500 });
  }
}
