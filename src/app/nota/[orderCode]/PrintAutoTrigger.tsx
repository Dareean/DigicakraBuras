"use client";

import { useEffect } from "react";

/**
 * Triggers window.print() automatically once the server-rendered
 * nota page has fully loaded. Runs client-side only.
 */
export default function PrintAutoTrigger() {
  useEffect(() => {
    // Small delay to ensure full paint before print dialog
    const timer = setTimeout(() => {
      window.print();
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
