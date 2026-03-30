import { notFound } from "next/navigation";

import { ListaItem } from "@/components/listas/ListaItem";
import { Button } from "@/components/ui/Button";
import { getCurrentTenantGiftList } from "@/lib/gift-lists/service";
import { formatDate } from "@/lib/utils";

type ListDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const list = await getCurrentTenantGiftList(params.id);

  if (!list) {
    notFound();
  }

  const items = list.items
    .map((item) => {
      if (!item.product) {
        return null;
      }

      return { ...item, product: item.product };
    })
    .filter(Boolean);

  const summary = {
    disponivel: list.items.filter((item) => item.status === "disponivel").length,
    reservado: list.items.filter((item) => item.status === "reservado").length,
    comprado: list.items.filter((item) => item.status === "comprado").length
  };

  return (
    <div className="space-y-8">
      <section className="hero-panel overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
          <img src={list.photo} alt={list.brideName} className="h-full min-h-[320px] w-full rounded-[2rem] object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-black/45">Detalhes da lista</p>
            <h1 className="mt-4 font-serif text-5xl text-ink">{list.brideName}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-black/65">{list.headline}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">Evento</p>
                <p className="mt-2 text-lg font-medium text-ink">{formatDate(list.eventDate)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">Cidade</p>
                <p className="mt-2 text-lg font-medium text-ink">{list.city}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-black/45">Itens</p>
                <p className="mt-2 text-lg font-medium text-ink">{list.items.length} presentes</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={`/lista-publica/${list.slug}`} size="lg">
                Abrir página pública
              </Button>
              <Button href="/listas" variant="secondary" size="lg">
                Voltar para listas
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">Disponíveis</p>
          <p className="mt-3 font-serif text-4xl text-ink">{summary.disponivel}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">Reservados</p>
          <p className="mt-3 font-serif text-4xl text-ink">{summary.reservado}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">Comprados</p>
          <p className="mt-3 font-serif text-4xl text-ink">{summary.comprado}</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) =>
          item ? (
            <ListaItem key={item.id} product={item.product} status={item.status} note={item.note} />
          ) : null
        )}
      </section>
    </div>
  );
}
