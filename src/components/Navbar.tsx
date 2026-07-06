"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("layanan");

  const navLinks = [
    { name: "Layanan", href: "/#layanan", section: "layanan" },
    { name: "Promo", href: "/#promo", section: "promo" },
    { name: "Cara Kerja", href: "/#cara-kerja", section: "cara-kerja" },
    { name: "Tracking Pesanan", href: "/tracking", section: "tracking" },
  ];

  useEffect(() => {
    if (pathname !== "/") return;

    const sections = ["layanan", "promo", "cara-kerja"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        {
          rootMargin: "-25% 0px -55% 0px", // Trigger when section occupies the upper-middle of viewport
          threshold: 0.1,
        }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-red-600 tracking-wider">
              DIGICAKRA
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => {
              let isActive = false;
              if (link.section === "tracking") {
                isActive = pathname === "/tracking";
              } else if (pathname === "/") {
                isActive = activeSection === link.section;
              }

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative text-sm font-medium transition-colors py-2 px-1 ${
                    isActive 
                      ? "text-red-600 font-semibold border-b-2 border-red-600" 
                      : "text-slate-600 hover:text-red-600"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <Link href="/tracking" className="md:hidden text-sm font-medium text-slate-600 hover:text-red-600">
              Track
            </Link>
            <Link
              href="/order"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all shadow-sm"
            >
              Pesan Sekarang
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
