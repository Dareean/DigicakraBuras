import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DIGICAKRA — One-Stop QRIS Solution untuk Fotocopy Cakrawala",
  description: "Platform digital terintegrasi untuk pemesanan jasa print online, pemesanan ATK, kasir (POS), pembayaran QRIS & tunai, pelacakan pesanan, dan perhitungan pajak otomatis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
