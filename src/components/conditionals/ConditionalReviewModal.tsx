"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Product, ConditionalRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function ConditionalReviewModal({
  conditional,
  products,
  onClose,
  onConfirm
}: {
  conditional: ConditionalRecord;
  products: Product[];
  onClose: () => void;
  onConfirm: (soldQuantities: Record<string, number>) => void;
}) {
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>(
    Object.fromEntries(conditional.items.map((item) => [item.productId, 0]))
  );

  const totalSoldValue = conditional.items.reduce((sum, item) => {
    const soldQty = soldQuantities[item.productId] ?? 0;
    return sum + soldQty * item.unitPrice;
  }, 0);

  const setQty = (productId: string, nextQty: number, maxQty: number) => {
    setSoldQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(maxQty, nextQty))
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a2421]/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] border-2 border-[#b08d57]/20 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="overflow-y-auto p-8 md:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">Retorno do condicional</p>
            <h2 className="mt-2 font-serif text-4xl text-[#2a2421]">O que o cliente decidiu levar?</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#b08d57]/20 p-3 text-[#8c6d45] hover:bg-[#f7f2ed] transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 space-y-4">
          {conditional.items.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            const soldQty = soldQuantities[item.productId] ?? 0;
            const returnedQty = item.qtySent - soldQty;
            return (
              <div key={item.productId} className="rounded-[2rem] border border-[#b08d57]/10 bg-[#fdfbf7] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-serif text-2xl text-[#2a2421] truncate">{product?.name ?? item.productId}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6d45]">
                      Retirado {item.qtySent} · {formatCurrency(item.unitPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQty(item.productId, soldQty - 1, item.qtySent)}
                      className="h-10 w-10 rounded-full border border-[#b08d57]/20 text-[#8c6d45] hover:bg-white transition-all"
                    >
                      -
                    </button>
                    <div className="rounded-2xl bg-white px-5 py-3 text-center shadow-sm border border-[#b08d57]/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">Compra</p>
                      <p className="mt-1 text-2xl font-black text-[#2a2421]">{soldQty}</p>
                    </div>
                    <button
                      onClick={() => setQty(item.productId, soldQty + 1, item.qtySent)}
                      className="h-10 w-10 rounded-full bg-[#8c6d45] text-white hover:bg-[#725a38] transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.22em]">
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 border border-amber-200">
                    Devolução automática {returnedQty}
                  </span>
                  <span className="rounded-full bg-[#f7f2ed] px-3 py-1.5 text-[#8c6d45]">
                    Venda gerada {formatCurrency(soldQty * item.unitPrice)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[2rem] border border-[#b08d57]/10 bg-[#fefcfb] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">Total que vai para o caixa</p>
            <p className="mt-2 font-serif text-3xl text-[#2a2421]">{formatCurrency(totalSoldValue)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border-2 border-[#b08d57]/20 px-6 py-3 text-xs font-black uppercase tracking-widest text-[#5c4a33] hover:bg-white transition-all"
            >
              Voltar
            </button>
            <button
              onClick={() => onConfirm(soldQuantities)}
              className="rounded-2xl bg-[#8c6d45] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all"
            >
              {totalSoldValue > 0 ? "Enviar ao caixa" : "Confirmar devolução"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
