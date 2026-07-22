"use client";

import { Printer } from "lucide-react";

export default function NotaActions({ orderCode }: { orderCode: string }) {
  return (
    <div className="no-print" style={{ marginTop: 16 }}>
      {/* Cetak langsung menggunakan print dialog browser */}
      <button
        onClick={() => window.print()}
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
          boxSizing: "border-box",
        }}
      >
        <Printer style={{ display: "inline-block", verticalAlign: "middle" }} />
      </button>
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

