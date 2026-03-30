import Link from "next/link";

import { getCurrentTenantSettings } from "@/lib/tenants/service";

const navigation = [
  { href: "/dashboard", label: "Painel" },
  { href: "/produtos", label: "Produtos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/condicionais", label: "Condicionais" },
  { href: "/caixa", label: "Caixa" },
  { href: "/listas", label: "Listas" }
];

async function resolveHeaderBrand() {
  const tenant = await getCurrentTenantSettings();

  return {
    shortName: tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts",
    name: tenant?.businessName ?? tenant?.displayName ?? "MBGifts"
  };
}

export async function Header() {
  const tenant = await resolveHeaderBrand();

  return (
    <header className="sticky top-0 z-30 border-b border-white/35 bg-[rgba(247,242,237,0.36)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/55 bg-white/45 shadow-[0_10px_30px_rgba(166,155,143,0.12)] backdrop-blur-md">
              <div className="text-center">
                <div className="font-serif text-2xl leading-none text-ink">MB</div>
                <div className="mt-1 text-[8px] uppercase tracking-[0.42em] text-black/45">Gifts</div>
              </div>
            </div>
            <div>
              <p className="font-serif text-2xl text-ink">{tenant.shortName}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-black/40">Presentes</p>
            </div>
          </Link>
          <div className="hidden rounded-full border border-white/55 bg-white/38 px-4 py-2 text-xs uppercase tracking-[0.24em] text-black/50 backdrop-blur-md sm:block">
            {tenant.name}
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-w-fit items-center rounded-full border border-white/60 bg-white/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-ink backdrop-blur-md transition hover:bg-white/58"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
