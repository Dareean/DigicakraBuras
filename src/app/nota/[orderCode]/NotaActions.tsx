"use client";

import { Printer } from "lucide-react";

/**
 * Client Component untuk tombol-tombol interaktif di nota.
 *
 * KEAMANAN: Tombol "Cetak Nota" membuka URL PDF yang di-generate SERVER-SIDE.
 * PDF adalah file binary — browser DevTools tidak bisa mengubah isi PDF
 * seperti yang bisa dilakukan pada HTML DOM.
 */
export default function NotaActions({ orderCode }: { orderCode: string }) {
  const pdfUrl = `/api/orders/${orderCode}/nota-pdf`;

  return (
    <div className="no-print" style={{ marginTop: 16 }}>
      {/* Buka PDF di tab baru — data langsung dari server, tidak bisa dimanipulasi */}
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          width: "100%",
          padding: "10px",
          background: "#1e293b",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.5px",
          textAlign: "center",
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        <Printer />
      </a>
      <button
        onClick={() => window.close()}
        style={{
          display: "block",
          width: "100%",
          marginTop: 8,
          padding: "8px",
          background: "transparent",
          color: "#64748b",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Tutup
      </button>
    </div>
  );
}
