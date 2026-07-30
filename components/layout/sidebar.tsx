"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/prehled", label: "Přehled", icon: "📊" },
  { href: "/prijate-doklady", label: "Přijaté doklady", icon: "📥" },
  { href: "/vydane-doklady", label: "Vydané doklady", icon: "📤" },
  { href: "/banka", label: "Banka", icon: "🏦" },
  { href: "/parovani", label: "Párování", icon: "🔗" },
  { href: "/ke-kontrole", label: "Ke kontrole", icon: "⚠️" },
  { href: "/exporty", label: "Exporty", icon: "📁" },
  { href: "/nastaveni", label: "Nastavení", icon: "⚙️" },
];

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-[#1e3a5f] text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-lg font-semibold leading-tight">MKD Účetnictví</div>
        <div className="text-xs text-white/60 mt-0.5">MKD Enterprise, s.r.o.</div>
      </div>
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/10 border-l-4 border-white font-medium"
                  : "border-l-4 border-transparent text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {userEmail ? (
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/70 flex items-center justify-between gap-2">
          <span className="truncate">{userEmail}</span>
          <form action={signOut}>
            <button type="submit" className="text-white/60 hover:text-white shrink-0">
              Odhlásit
            </button>
          </form>
        </div>
      ) : null}
      <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/50">
        Nástroj pro přípravu podkladů.
        <br />
        Nenahrazuje odborné účetní posouzení.
      </div>
    </aside>
  );
}
