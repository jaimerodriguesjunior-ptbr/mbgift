"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Determine full-screen pages
  const isDashboardHome = pathname === "/dashboard";
  const isCaixa = pathname === "/caixa";
  const isClientes = pathname === "/clientes";
  const isProdutos = pathname === "/produtos";
  const isFullscreen = [
    "/produtos", 
    "/clientes", 
    "/condicionais",
    "/caixa", 
    "/configuracoes"
  ].includes(pathname) || pathname.startsWith("/listas") || pathname.startsWith("/lista");

  // Determine the background class based on route
  const getBackgroundClass = () => {
    if (isDashboardHome) return "bg-dashboard-boutique flex min-h-screen items-center justify-center p-4 sm:p-8";
    if (isCaixa) return "bg-pos-boutique h-screen w-full overflow-hidden";
    if (isClientes) return "bg-crm-boutique h-screen w-full overflow-hidden";
    if (isProdutos) return "bg-products-boutique h-screen w-full overflow-hidden";
    if (isFullscreen) return "h-screen w-full overflow-hidden";
    return "page-shell min-h-screen";
  };

  return (
    <main className={getBackgroundClass()}>
      <LogoutButton />
      {children}
    </main>
  );
}
