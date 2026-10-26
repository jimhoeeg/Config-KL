import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin – Varmepumperådgiveren", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
          <span className="font-bold text-primary">KL · Varmepumperådgiveren</span>
          <nav className="flex flex-wrap gap-4 font-medium">
            <Link href="/admin">Leads</Link>
            <Link href="/admin/funnel">Funnel</Link>
            <Link href="/admin/config">Priser og faktorer</Link>
            <Link href="/admin/videnskort">Videnskort</Link>
          </nav>
          <form action={logout} className="ml-auto">
            <button className="text-muted-foreground hover:underline">Log ud</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
