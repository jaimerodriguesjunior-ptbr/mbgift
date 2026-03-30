import { ClipboardList, Gift, Settings } from "lucide-react";
import Link from "next/link";

import { MenuCard } from "@/components/dashboard/MenuCard";
import { ClientsIcon, ProductsIcon, SalesIcon } from "@/components/icons";
import { getCurrentTenantSettings } from "@/lib/tenants/service";

async function resolveDashboardBrand() {
  const tenant = await getCurrentTenantSettings();

  return {
    displayName: tenant?.displayName ?? tenant?.logoLabel ?? "MBGifts",
    businessName: tenant?.businessName ?? tenant?.displayName ?? "MBGifts",
    tagline: tenant?.tagline ?? "Gestão e operação da loja"
  };
}

export default async function DashboardPage() {
  const brand = await resolveDashboardBrand();

  return (
    <div className="bg-dashboard-home relative flex min-h-screen w-full items-center justify-center overflow-hidden p-3 sm:p-12">
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="h-full w-full opacity-30" viewBox="0 0 1000 1000" fill="none" preserveAspectRatio="xMidYMid slice">
          <path
            d="M-100,200 C300,100 700,500 1100,400"
            stroke="#b08d57"
            strokeWidth="0.8"
            className="animate-swirl-slow"
          />
          <path
            d="M-50,800 C400,600 600,950 1050,700"
            stroke="#b08d57"
            strokeWidth="0.5"
            className="animate-swirl-slower"
          />
        </svg>
      </div>

      <div className="premium-glass-box relative z-10 flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col items-center justify-start p-4 animate-in fade-in zoom-in-95 duration-1000 ease-out sm:min-h-[60vh] sm:justify-center sm:p-6">
        <header className="mb-4 text-center animate-in fade-in slide-in-from-top-6 duration-1000 delay-300 ease-out sm:mb-8">
          <h1 className="font-serif text-3xl tracking-tight text-[#2a2421] sm:text-7xl">
            {brand.displayName}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 sm:gap-6">
            <div className="h-px w-5 bg-[#b08d57]/40 sm:w-8" />
            <p className="text-[7px] font-bold uppercase tracking-[0.28em] text-[#8c6d45] sm:text-[9px] sm:tracking-[0.4em]">
              {brand.tagline}
            </p>
            <div className="h-px w-5 bg-[#b08d57]/40 sm:w-8" />
          </div>
        </header>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-600 ease-out sm:grid-cols-3 sm:gap-4">
          <MenuCard
            href="/caixa"
            icon={<SalesIcon />}
            title="Vendas"
            description="Gestão de pedidos e relatórios."
          />
          <MenuCard
            href="/clientes"
            icon={<ClientsIcon />}
            title="Clientes"
            description="Cadastro e histórico CRM."
          />
          <MenuCard
            href="/produtos"
            icon={<ProductsIcon />}
            title="Produtos"
            description="Catálogo e estoque."
          />
        </div>

        <div className="mt-4 flex w-full max-w-4xl flex-col items-center animate-in fade-in duration-1000 delay-800 sm:mt-10">
          <div className="mb-3 flex h-5 w-full items-center justify-center opacity-70 sm:mb-8 sm:h-6">
            <svg className="h-full w-full max-w-[320px]" viewBox="0 0 400 30" fill="none">
              <path
                d="M0,15 C100,0 300,30 400,15"
                stroke="#b08d57"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="200" cy="15" r="2.5" fill="#b08d57" />
              <path
                d="M50,20 C150,5 250,25 350,10"
                stroke="#b08d57"
                strokeWidth="0.8"
                fill="none"
                opacity="0.8"
              />
            </svg>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-3 md:flex-nowrap">
            <Link
              href="/listas"
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-full border border-[#b08d57]/20 bg-white px-5 py-3 shadow-sm transition-all hover:border-[#b08d57]/50 hover:bg-[#f7f2ed] hover:shadow-lg active:scale-95 sm:min-h-0 sm:w-auto"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8c6d45]/10 text-[#8c6d45] transition-all group-hover:bg-[#8c6d45] group-hover:text-white">
                <Gift className="h-3.5 w-3.5" />
              </div>
              <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.32em] text-[#5c4a33]">
                Listas de Eventos
              </span>
            </Link>

            <Link
              href="/condicionais"
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-full border border-[#b08d57]/20 bg-white px-5 py-3 shadow-sm transition-all hover:border-[#b08d57]/50 hover:bg-[#f7f2ed] hover:shadow-lg active:scale-95 sm:min-h-0 sm:w-auto"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8c6d45]/10 text-[#8c6d45] transition-all group-hover:bg-[#8c6d45] group-hover:text-white">
                <ClipboardList className="h-3.5 w-3.5" />
              </div>
              <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.32em] text-[#5c4a33]">
                Condicional
              </span>
            </Link>

            <Link
              href="/configuracoes"
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-full border border-[#b08d57]/20 bg-white px-5 py-3 shadow-sm transition-all hover:border-[#b08d57]/50 hover:bg-[#f7f2ed] hover:shadow-lg active:scale-95 sm:min-h-0 sm:w-auto"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8c6d45]/10 text-[#8c6d45] transition-all group-hover:bg-[#8c6d45] group-hover:text-white">
                <Settings className="h-3.5 w-3.5" />
              </div>
              <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.32em] text-[#5c4a33]">
                Configurações
              </span>
            </Link>
          </div>
        </div>

        <footer className="mt-6 hidden gap-8 text-[10px] font-bold uppercase tracking-[0.4em] text-[#8c6d45]/40 animate-in fade-in duration-1000 delay-1000 sm:mt-12 sm:flex">
          <span>(c) 2026 {brand.businessName}</span>
          <span className="opacity-30">.</span>
          <span>Sistema MBGifts</span>
        </footer>
      </div>
    </div>
  );
}
