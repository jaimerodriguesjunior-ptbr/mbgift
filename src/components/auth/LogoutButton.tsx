"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hideOnRoute =
    pathname === "/produtos" ||
    pathname === "/clientes" ||
    pathname === "/caixa" ||
    pathname === "/condicionais" ||
    pathname === "/configuracoes" ||
    pathname.startsWith("/listas");

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={`fixed right-4 top-4 z-50 items-center gap-2 rounded-full border border-[#b08d57]/25 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#5c4a33] shadow-[0_14px_40px_rgba(92,74,51,0.14)] backdrop-blur-md transition hover:bg-[#f7f2ed] disabled:cursor-not-allowed disabled:opacity-70 sm:right-6 sm:top-6 ${
        hideOnRoute ? "hidden" : "inline-flex"
      }`}
      aria-label="Sair do painel"
    >
      <LogOut className="h-3.5 w-3.5" />
      {isSubmitting ? "Saindo..." : "Sair"}
    </button>
  );
}
