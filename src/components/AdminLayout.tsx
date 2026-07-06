"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  ShoppingBag,
  Boxes,
  Users,
  LineChart,
  LogOut,
  Menu,
  X
} from "lucide-react";

interface AdminUser {
  userId: number;
  email: string;
  name: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
    fetch("/api/admin/auth/session")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/admin/login");
        } else {
          const data = await res.json();
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Session check failed:", err);
        router.push("/admin/login");
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent mb-4"></div>
        <p className="text-slate-400 text-xs">Memeriksa hak akses admin...</p>
      </div>
    );
  }

  const sidebarLinks = [
    { name: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Kasir (POS)", href: "/admin/pos", icon: <Calculator className="w-5 h-5" /> },
    { name: "Live Orders", href: "/admin/orders", icon: <ClipboardList className="w-5 h-5" /> },
    { name: "Katalog ATK", href: "/admin/products", icon: <ShoppingBag className="w-5 h-5" /> },
    { name: "Bahan & Stok", href: "/admin/inventory", icon: <Boxes className="w-5 h-5" /> },
    { name: "Pelanggan & Stempel", href: "/admin/customers", icon: <Users className="w-5 h-5" /> },
  ];

  // RBAC Link addition: Only Owner can access Taxes / Pajak
  if (user && user.role === "owner") {
    sidebarLinks.push({
      name: "Pajak & Keuangan",
      href: "/admin/tax",
      icon: <LineChart className="w-5 h-5" />
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sticky Top Bar on Mobile */}
      <div className="sticky top-0 z-40 md:hidden bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 text-white w-full">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-extrabold text-base tracking-wider text-white">DIGICAKRA</span>
        </div>
        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-950/45 px-2 py-0.5 rounded border border-red-900/30">
          POS/Admin
        </span>
      </div>

      {/* Mobile Drawer (Collapsible overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop blur overlay */}
          <div onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"></div>

          {/* Collapsible Sidebar content */}
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between text-slate-400 transform transition-transform duration-300 ease-out translate-x-0 shadow-2xl">
            <div>
              {/* Logo & close button */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                <span className="text-xl font-black text-white tracking-wider">DIGICAKRA</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="text-slate-405 hover:text-white font-extrabold text-base p-1 hover:bg-slate-800 rounded transition-all text-slate-400"
                >
                  <X className="h-5.5 w-5.5" />
                </button>
              </div>

              {/* Profile widget */}
              <div className="p-4 bg-slate-800/40 border-b border-slate-800/80 flex items-center space-x-3 text-xs">
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold uppercase">
                  {user ? user.name[0] : "A"}
                </div>
                <div>
                  <p className="font-bold text-slate-200">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>

              {/* Links list */}
              <nav className="p-4 space-y-1">
                {sidebarLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-md text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-red-600 text-white shadow-md shadow-red-900/10"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-md text-xs font-semibold transition-all border border-slate-700/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Static Sidebar (Desktop only) */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-400 flex-col justify-between border-r border-slate-800 flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xl font-bold text-white tracking-wider">DIGICAKRA</span>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">
              POS/Admin
            </span>
          </div>

          {/* Profile widget */}
          <div className="p-4 bg-slate-800/40 border-b border-slate-800/80 flex items-center space-x-3 text-xs">
            <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold uppercase">
              {user ? user.name[0] : "A"}
            </div>
            <div>
              <p className="font-bold text-slate-200">{user?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-900/10"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-md text-xs font-semibold transition-all border border-slate-700/50"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main content frame */}
      <main className="flex-grow p-6 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
