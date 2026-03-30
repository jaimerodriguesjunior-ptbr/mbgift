import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock <= 3;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-card">
      <img src={product.images[product.mainImageIndex]} alt={product.name} className="h-56 w-full object-cover" />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">{product.category}</p>
            <h2 className="mt-2 font-serif text-2xl text-ink">{product.name}</h2>
          </div>
          {isLowStock ? <Badge tone="low-stock">Baixo estoque</Badge> : null}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Preço</p>
            <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(product.price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Estoque</p>
            <p className="mt-1 text-lg font-medium text-ink">{product.stock} un.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
