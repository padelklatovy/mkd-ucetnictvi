"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/prehled", label: "Přehled", icon: "📊" },
  { href: "/prijate-doklady", label: "Přijaté doklady", sub: "od dodavatelů – náklady", icon: "📥" },
  { href: "/vydane-doklady", label: "Vydané doklady", sub: "zákazníkům – tržby", icon: "📤" },
  { href: "/nabidky", label: "Nabídky", sub: "cenové nabídky zboží", icon: "📋" },
  { href: "/banka", label: "Banka", icon: "🏦" },
  { href: "/ke-kontrole", label: "Ke kontrole", icon: "⚠️" },
  { href: "/exporty", label: "Exporty", icon: "📁" },
  { href: "/nastaveni", label: "Nastavení", icon: "⚙️" },
];

function SidebarContent({
  userEmail,
  onNavigate,
}: {
  userEmail?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-[#1e3a5f] text-white min-h-screen flex flex-col w-64">
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
              onClick={onNavigate}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/10 border-l-4 border-white font-medium"
                  : "border-l-4 border-transparent text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>
                {item.label}
                {item.sub ? (
                  <span className="block text-[10px] font-normal text-white/50 leading-tight">
                    {item.sub}
                  </span>
                ) : null}
              </span>
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
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobilni horni lista s hamburger tlacitkem - viditelna jen pod md */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-[#1e3a5f] text-white px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Otevřít menu"
          className="p-1 -ml-1"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-sm font-semibold">MKD Účetnictví</div>
        <div className="w-6" />
      </div>

      {/* Desktop sidebar - vzdy viditelna od md vyse */}
      <div className="hidden md:block">
        <SidebarContent userEmail={userEmail} />
      </div>

      {/* Mobilni zasouvaci panel */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <SidebarContent userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zavřít menu"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}
