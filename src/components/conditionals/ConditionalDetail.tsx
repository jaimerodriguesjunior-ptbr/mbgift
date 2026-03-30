"use client";

import { ArrowUpRight, Check, ClipboardList, Printer, Timer, TrendingUp, Undo2 } from "lucide-react";
import {
  getConditionalAdditionalVisitRevenue,
  getConditionalConvertedValue,
  getConditionalDerivedStatus,
  getConditionalReturnedValue,
  getConditionalVisitRevenue,
  getConditionalValue,
} from "@/lib/operations";
import { ConditionalRecord, Client, Product, SaleRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  open: "Em aberto",
  due_today: "Vence hoje",
  late: "Atrasado",
  converted_full: "Venda total",
  converted_partial: "Venda parcial",
  returned_full: "Devolvido",
  canceled: "Cancelado"
};

export function ConditionalDetail({
  conditional,
  client,
  products,
  sales,
  checkoutDraftId,
  onOpenReceipt,
  onOpenReview,
  onGoToCheckout
}: {
  conditional: ConditionalRecord;
  client: Client | null;
  products: Product[];
  sales: SaleRecord[];
  checkoutDraftId?: string | null;
  onOpenReceipt: () => void;
  onOpenReview: () => void;
  onGoToCheckout: () => void;
}) {
  const derivedStatus = getConditionalDerivedStatus(conditional);
  const sentValue = getConditionalValue(conditional);
  const convertedValue = getConditionalConvertedValue(conditional);
  const returnedValue = getConditionalReturnedValue(conditional);
  const visitRevenue = getConditionalVisitRevenue(conditional, sales);
  const additionalVisitRevenue = getConditionalAdditionalVisitRevenue(conditional, sales);
  const hasPendingCheckout = checkoutDraftId === conditional.id;

  return (
    <div className="p-8 md:p-10 space-y-8">
      <div className="rounded-[2.5rem] border border-[#b08d57]/15 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8c6d45]">Cliente</p>
            <h2 className="font-serif text-5xl text-[#2a2421]">{client?.name ?? "Cliente não encontrado"}</h2>
            <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c6d45]">
              <span>{client?.phone ?? "Sem telefone"}</span>
              <span>Devolução {new Date(`${conditional.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>
              <span>Status {STATUS_LABELS[derivedStatus]}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenReceipt}
              className="inline-flex items-center gap-2 rounded-full border border-[#b08d57]/20 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#5c4a33] hover:bg-[#f7f2ed] transition-all"
            >
              <Printer className="h-4 w-4" />
              {conditional.receiptPrintedAt ? "Reimprimir recibo" : "Imprimir recibo"}
            </button>

            {conditional.status === "open" ? (
              hasPendingCheckout ? (
                <button
                  onClick={onGoToCheckout}
                  className="inline-flex items-center gap-2 rounded-full bg-[#8c6d45] px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Continuar no caixa
                </button>
              ) : (
                <button
                  onClick={onOpenReview}
                  className="inline-flex items-center gap-2 rounded-full bg-[#8c6d45] px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all"
                >
                  <Check className="h-4 w-4" />
                  Cliente voltou com os itens
                </button>
              )
            ) : null}
          </div>
        </div>

        {conditional.notes ? (
          <div className="mt-6 rounded-2xl border border-[#b08d57]/10 bg-[#fdfbf7] px-5 py-4 text-sm text-[#5c4a33]">
            {conditional.notes}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Valor enviado" value={formatCurrency(sentValue)} accent="default" />
          <MetricCard label="Itens do condicional vendidos" value={formatCurrency(convertedValue)} accent="success" />
          <MetricCard label="Venda total na visita" value={formatCurrency(visitRevenue)} accent="default" />
          <MetricCard label="Venda adicional na visita" value={formatCurrency(additionalVisitRevenue)} accent="success" />
          <MetricCard label="Devolvido do condicional" value={formatCurrency(returnedValue)} accent="warning" />
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-[#b08d57]/15 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#b08d57]/10 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8c6d45]">Itens levados</p>
            <h3 className="mt-2 font-serif text-3xl text-[#2a2421]">Conferência da saída</h3>
          </div>
          <span className="rounded-full border border-[#b08d57]/20 bg-[#fdfbf7] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6d45]">
            Aberto em {new Date(conditional.openedAt).toLocaleDateString("pt-BR")}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {conditional.items.map((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return (
              <div key={item.productId} className="flex flex-col gap-4 rounded-[2rem] border border-[#b08d57]/10 bg-[#fefcfb] p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-serif text-2xl text-[#2a2421] truncate">{product?.name ?? item.productId}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">
                    Retirado {item.qtySent} · unitário {formatCurrency(item.unitPrice)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.22em]">
                  <span className="rounded-full bg-[#f7f2ed] px-3 py-1.5 text-[#8c6d45]">Venda {item.qtySold}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 border border-amber-200">Devolução {item.qtyReturned}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: "default" | "success" | "warning" | "danger";
}) {
  const tone =
    accent === "success"
      ? "border-green-200 bg-green-50/70 text-green-800"
      : accent === "warning"
        ? "border-amber-200 bg-amber-50/70 text-amber-800"
        : accent === "danger"
          ? "border-red-200 bg-red-50/70 text-red-800"
          : "border-[#b08d57]/15 bg-white text-[#2a2421]";

  const Icon =
    accent === "success"
      ? TrendingUp
      : accent === "warning"
        ? Timer
        : accent === "danger"
          ? Undo2
          : ClipboardList;

  return (
    <div className={`rounded-[2rem] border p-5 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">{label}</p>
          <p className="mt-3 font-serif text-3xl">{value}</p>
        </div>
        <div className="rounded-full border border-current/15 p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
