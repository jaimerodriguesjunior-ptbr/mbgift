"use client";

import { X } from "lucide-react";
import { getConditionalValue } from "@/lib/operations";
import { ConditionalRecord, Client, Product } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function ConditionalReceiptModal({
  conditional,
  client,
  products,
  onClose,
  onPrint
}: {
  conditional: ConditionalRecord;
  client: Client | null;
  products: Product[];
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a2421]/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[2.5rem] bg-white border-2 border-[#b08d57]/20 shadow-2xl p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8c6d45]">Recibo de retirada</p>
            <h2 className="mt-2 font-serif text-4xl text-[#2a2421]">{client?.name ?? "Cliente"}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#b08d57]/20 p-3 text-[#8c6d45] hover:bg-[#f7f2ed] transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#b08d57]/12 bg-[#fefcfb] p-6">
          <div className="grid gap-3 md:grid-cols-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c6d45]">
            <span>Data de abertura: {new Date(conditional.openedAt).toLocaleDateString("pt-BR")}</span>
            <span>Devolução prevista: {new Date(`${conditional.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>
            <span>Telefone: {client?.phone ?? "-"}</span>
            <span>Documento: {client?.cpf ?? "-"}</span>
          </div>

          <div className="mt-6 space-y-3">
            {conditional.items.map((item) => {
              const product = products.find((entry) => entry.id === item.productId);
              return (
                <div key={item.productId} className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 border border-[#b08d57]/10">
                  <div>
                    <p className="font-serif text-xl text-[#2a2421]">{product?.name ?? item.productId}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">
                      Quantidade {item.qtySent}
                    </p>
                  </div>
                  <p className="text-sm font-black text-[#5c4a33]">{formatCurrency(item.unitPrice)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[#b08d57]/10 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">Valor enviado</p>
            <p className="mt-2 font-serif text-3xl text-[#2a2421]">{formatCurrency(getConditionalValue(conditional))}</p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-[#b08d57]/20 py-3.5 text-xs font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] transition-all"
          >
            Fechar
          </button>
          <button
            onClick={onPrint}
            className="flex-1 rounded-2xl bg-[#8c6d45] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all"
          >
            Imprimir recibo
          </button>
        </div>
      </div>
    </div>
  );
}
