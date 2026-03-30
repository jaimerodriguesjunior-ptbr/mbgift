import { CalendarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { GiftListRecord } from "@/lib/gift-lists/types";
import { formatDate } from "@/lib/utils";

type ListaCardProps = {
  list: GiftListRecord;
};

export function ListaCard({ list }: ListaCardProps) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-card">
      <img src={list.photo} alt={list.brideName} className="h-56 w-full object-cover" />
      <div className="space-y-5 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">{list.city}</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">{list.brideName}</h2>
          <p className="mt-3 text-sm leading-7 text-black/62">{list.headline}</p>
        </div>
        <div className="flex items-center gap-3 rounded-[1.5rem] bg-cream px-4 py-3 text-sm text-ink">
          <CalendarIcon className="h-5 w-5" />
          <span>{formatDate(list.eventDate)}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href={`/listas/${list.id}`} className="flex-1">
            Ver detalhes
          </Button>
          <Button href={`/lista-publica/${list.slug}`} variant="secondary" className="flex-1">
            Abrir página pública
          </Button>
        </div>
      </div>
    </article>
  );
}
