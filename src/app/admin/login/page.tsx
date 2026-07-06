"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to admin dashboard
        router.push("/admin");
      } else {
        setError(data.error || "Email atau password salah");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-sm font-extrabold text-red-500 uppercase tracking-widest bg-red-950/40 px-3 py-1.5 rounded-full border border-red-900/30">
          Admin Dashboard
        </span>
        <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
          DIGICAKRA
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Masuk untuk mengoperasikan kasir dan memonitor transaksi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800 py-8 px-6 shadow-xl border border-slate-700/50 rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 text-xs font-semibold rounded">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="contoh@cakrawala.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 h-11 bg-slate-950 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 h-11 bg-slate-950 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-white"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow-md transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Menghubungkan...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 border-t border-slate-700 pt-6 text-center text-[10px] text-slate-500">
            <p>Pemberitahuan: Akses dibatasi hanya untuk Staf Kasir dan Owner Fotocopy Cakrawala.</p>
            <p className="mt-1">Akun Seeder: owner@cakrawala.id (pass: owner123) | staff@cakrawala.id (pass: staff123)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
