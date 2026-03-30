import { notFound } from "next/navigation";

import { ListaItem } from "@/components/listas/ListaItem";
import { Button } from "@/components/ui/Button";
import { getPublicGiftListBySlug } from "@/lib/gift-lists/service";
import { getTenantStoreIdentityByIdAdmin } from "@/lib/tenants/repository";
import { formatDate } from "@/lib/utils";

type PublicListPageProps = {
  params: {
    slug: string;
  };
};

export default async function PublicListPage({ params }: PublicListPageProps) {
  const list = await getPublicGiftListBySlug(params.slug);

  if (!list) {
    notFound();
  }

  const tenant = await getTenantStoreIdentityByIdAdmin(list.tenantId);
  if (!tenant) {
    notFound();
  }

  const items = list.items.filter((item) => item.product);

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass-premium border-b border-black/[0.03]">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl tracking-tight text-ink uppercase">{tenant.logoLabel ?? tenant.displayName}</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-ink/70">
            <a href="#" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/40 glass-premium transition-all duration-500">Novidades</a>
            <a href="#" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/40 glass-premium transition-all duration-500">Le Creuset</a>
            <a href="#" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/40 glass-premium transition-all duration-500">Listas</a>
            <a href="#" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/40 glass-premium transition-all duration-500">Sobre</a>
          </div>
          <Button variant="outline" size="sm" className="rounded-full border-black/10 text-[10px] uppercase tracking-widest">
            Entrar
          </Button>
        </div>
      </header>

      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-16 items-start">
            <div className="relative z-10 space-y-16">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] w-12 bg-taupe/30" />
                  <span className="text-[10px] uppercase tracking-[0.5em] text-taupe font-bold">
                    Est. 2023 | {tenant.logoLabel ?? tenant.displayName}
                  </span>
                </div>

                <div className="relative">
                  <h1 className="font-serif text-7xl md:text-9xl leading-[0.85] text-ink transition-all">
                    {list.brideName.split(" & ")[0]} <br />
                    <span className="pl-12 md:pl-24">& {list.brideName.split(" & ")[1]}</span>
                  </h1>
                </div>

                <div className="pt-8 max-w-lg border-t border-taupe/20">
                  <p className="font-serif text-3xl md:text-4xl text-ink/40 italic leading-snug">
                    "{list.headline}"
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0 border border-taupe/20 inline-flex">
                <div className="px-10 py-8 border-r border-taupe/20 group cursor-default hover:bg-white/40 transition-colors">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-taupe mb-3 font-bold opacity-60">Celebração</p>
                  <p className="font-serif text-2xl uppercase tracking-tighter">{formatDate(list.eventDate)}</p>
                </div>
                <div className="px-10 py-8 group cursor-default hover:bg-white/40 transition-colors">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-taupe mb-3 font-bold opacity-60">Venue</p>
                  <p className="font-serif text-2xl uppercase tracking-tighter">{list.city}</p>
                </div>
              </div>

              <div className="max-w-sm">
                <p className="text-[11px] uppercase tracking-[0.25em] leading-loose text-ink/40 font-bold">
                  Uma curadoria exclusiva de presentes para o novo lar de {list.brideName}. Explore nossa seleção especial.
                </p>
              </div>
            </div>

            <div className="relative pt-12">
              <div className="absolute top-0 right-0 w-full h-[1px] bg-taupe/20" />
              <div className="absolute top-0 right-0 w-[1px] h-full bg-taupe/20" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm shadow-2xl m-8">
                <img
                  src={list.photo}
                  alt={list.brideName}
                  className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-1000 scale-110 hover:scale-100"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-1">
            <h2 className="font-serif text-4xl text-ink">A Lista de Desejos</h2>
            <p className="text-xs uppercase tracking-widest text-ink/40">Presentes selecionados à mão</p>
          </div>
          <div className="hidden sm:flex gap-4">
            <div className="px-4 py-2 bg-white border border-black/5 rounded-full text-[10px] uppercase tracking-widest text-ink/60 hover:border-gold/30 cursor-pointer transition-colors">Todas</div>
            <div className="px-4 py-2 bg-white border border-black/5 rounded-full text-[10px] uppercase tracking-widest text-ink/60 hover:border-gold/30 cursor-pointer transition-colors">Cozinha</div>
            <div className="px-4 py-2 bg-white border border-black/5 rounded-full text-[10px] uppercase tracking-widest text-ink/60 hover:border-gold/30 cursor-pointer transition-colors">Mesa Posta</div>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ListaItem
              key={item.id}
              product={item.product!}
              status={item.status}
              note={item.note}
              publicView
            />
          ))}
        </div>
      </section>

      <footer className="mt-40 pt-20 pb-10 border-t border-black/[0.05]">
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-12 items-start">
          <div className="space-y-6">
            <span className="font-serif text-3xl tracking-tight text-ink uppercase">{tenant.logoLabel ?? tenant.displayName}</span>
            <p className="text-sm text-ink/40 max-w-xs">{tenant.tagline}</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-ink/30">Navegação</h4>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><a href="#" className="hover:text-gold transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Nossas Lojas</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Atendimento</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-ink/30">Institucional</h4>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><a href="#" className="hover:text-gold transition-colors">Política de Devolução</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Privacidade</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 mt-20 pt-8 border-t border-black/[0.03] flex justify-between items-center text-[10px] uppercase tracking-widest text-ink/30">
          <p>© 2026 {tenant.displayName}. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#">Instagram</a>
            <a href="#">Pinterest</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
