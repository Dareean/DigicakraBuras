"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Layanan", href: "/" },
    { name: "Promo", href: "/#promo" },
    { name: "Cara Kerja", href: "/#cara-kerja" },
    { name: "Tracking Pesanan", href: "/tracking" },
  ];

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
              const isActive = pathname === link.href || (link.href.startsWith("/#") && pathname === "/");
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
