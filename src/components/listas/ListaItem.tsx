import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";
import type { GiftItemStatus, Product } from "@/types";

type ListaItemProps = {
  product: Product;
  status: GiftItemStatus;
  note?: string;
  publicView?: boolean;
  onChoose?: () => void;
};

const statusConfig: Record<GiftItemStatus, { label: string; tone: string }> = {
  disponivel: {
    label: "Disponível",
    tone: "border-white/30 bg-[#7f6848]/88 text-white shadow-[0_10px_24px_rgba(127,104,72,0.28)]"
  },
  reservado: { label: "Reservado", tone: "text-ink/40 bg-ink/5 border-ink/10" },
  comprado: { label: "Presenteado", tone: "text-white bg-[#8c6d45] border-transparent" }
};

export function ListaItem({ product, status, publicView = false, onChoose }: ListaItemProps) {
  const isAvailable = status === "disponivel";
  const isBought = status === "comprado";
  const isReserved = status === "reservado";
  const isTaken = isBought || isReserved;
  const mainImage = product.images[product.mainImageIndex] ?? product.images[0] ?? "/images/placeholder-product.jpg";

  return (
    <article className={`group relative overflow-hidden rounded-[2rem] border-premium bg-white/40 pb-5 backdrop-blur-sm transition-all duration-700 hover-lift ${
      isTaken ? "scale-[0.98] opacity-80" : ""
    }`}>
      <div className="relative aspect-[1/1.02] overflow-hidden bg-beige/20 md:aspect-[1/1.08]">
        <img
          src={mainImage}
          alt={product.name}
          className={`h-full w-full object-cover transition-all duration-1000 ease-out ${
            isTaken ? "grayscale brightness-90" : "group-hover:scale-110"
          }`}
        />

        {isTaken && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/10 backdrop-blur-[2px] animate-in fade-in duration-500">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-5 py-2.5 shadow-2xl backdrop-blur-md">
              <Check className="h-4 w-4 stroke-[3px] text-[#8c6d45]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2a2421]">
                {isBought ? "Presenteado" : "Reservado"}
              </span>
            </div>
          </div>
        )}

        {!isBought && (
          <div className="absolute inset-0 bg-taupe/10 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        )}

        <div className="absolute left-4 top-4 md:left-5 md:top-5">
          <span className="rounded-full border border-white/40 bg-white/82 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.3em] text-ink/70 backdrop-blur-md md:px-4">
            {product.category}
          </span>
        </div>

        <div className="absolute right-4 top-4 md:right-5 md:top-5">
          <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] backdrop-blur-md transition-all md:px-4 ${statusConfig[status].tone}`}>
            {statusConfig[status].label}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#201b19]/82 via-[#201b19]/34 to-transparent px-5 pb-5 pt-16 md:px-6 md:pb-6">
          <div className="rounded-[1.75rem] border border-white/20 bg-[#201b19]/48 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-md md:px-5 md:py-4">
            <h3 className={`line-clamp-2 font-serif text-[2rem] leading-[1.05] tracking-[-0.04em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] md:text-[2.2rem] ${
              isBought ? "opacity-75" : ""
            }`}>
              {product.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 md:px-6 md:pt-5">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-taupe opacity-50">Valor único</p>
            <p className={`text-[2rem] font-light leading-none tracking-tight text-ink ${isBought ? "opacity-30" : ""}`}>
              {formatCurrency(product.price)}
            </p>
          </div>

          {publicView && (
            <Button
              variant={isAvailable ? "primary" : "ghost"}
              size="xs"
              onClick={onChoose}
              className={`rounded-full border border-white/20 shadow-sm transition-all ${
                isAvailable ? "" : "pointer-events-none opacity-30 grayscale"
              }`}
            >
              {isAvailable ? "Reservar" : isBought ? "Presenteado" : "Reservado"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
