"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("layanan");
  const [isOpen, setIsOpen] = useState(false);

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
          rootMargin: "-25% 0px -55% 0px",
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

  // Close mobile menu on page transitions
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-red-650 tracking-wider hover:opacity-90">
              DIGICAKRA
            </Link>
          </div>

          {/* Navigation Links (Desktop) */}
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
                  className={`relative text-sm font-semibold transition-colors py-2 px-1 ${
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
          <div className="flex items-center space-x-3">
            <Link
              href="/order"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all shadow-sm"
            >
              Pesan Sekarang
            </Link>

            {/* Mobile Hamburger menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none md:hidden transition-all"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Toggle Main Menu</span>
              {isOpen ? (
                <X className="h-5.5 w-5.5" />
              ) : (
                <Menu className="h-5.5 w-5.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown list */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white" id="mobile-menu">
          <div className="space-y-1 px-4 pt-2 pb-4">
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
                  onClick={() => setIsOpen(false)}
                  className={`block rounded px-3 py-2.5 text-xs font-extrabold transition-all ${
                    isActive
                      ? "bg-red-50 text-red-600 font-bold"
                      : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

