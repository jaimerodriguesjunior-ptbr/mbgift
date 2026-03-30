"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, Plus, Search } from "lucide-react";
import { ConditionalCreateModal, type DraftConditionalItem } from "@/components/conditionals/ConditionalCreateModal";
import { ConditionalDetail } from "@/components/conditionals/ConditionalDetail";
import { ConditionalReceiptModal } from "@/components/conditionals/ConditionalReceiptModal";
import { ConditionalReviewModal } from "@/components/conditionals/ConditionalReviewModal";
import { formatCurrency } from "@/lib/utils";
import {
  closeConditionalAsReturned,
  createConditional,
  fetchClients,
  fetchConditionals,
  fetchCurrentTenantSettings,
  fetchProducts,
  fetchSales,
  markConditionalReceiptPrinted,
  prepareConditionalCheckout
} from "@/lib/painel-api";
import {
  getAvailableStock,
  getConditionalAdditionalVisitRevenue,
  getConditionalConvertedValue,
  getConditionalDerivedStatus,
  getConditionalVisitRevenue,
  getConditionalValue,
  readCheckoutDraft,
  writeCheckoutDraft
} from "@/lib/operations";
import { CheckoutDraft, Client, ConditionalRecord, Product, SaleRecord } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  open: "Em aberto",
  due_today: "Vence hoje",
  late: "Atrasado",
  converted_full: "Venda total",
  converted_partial: "Venda parcial",
  returned_full: "Devolvido",
  canceled: "Cancelado"
};

const todayPlusDays = (days: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export default function CondicionaisPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conditionals, setConditionals] = useState<ConditionalRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [selectedConditionalId, setSelectedConditionalId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiptForId, setShowReceiptForId] = useState<string | null>(null);
  const [reviewingConditionalId, setReviewingConditionalId] = useState<string | null>(null);
  const [draftClientId, setDraftClientId] = useState("");
  const [draftDueDate, setDraftDueDate] = useState(todayPlusDays(7));
  const [draftNotes, setDraftNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftConditionalItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storeLabel, setStoreLabel] = useState("MBGifts");
  const queryHandledRef = useRef(false);

  const selectedConditional = conditionals.find((entry) => entry.id === selectedConditionalId) ?? null;
  const trustedClients = clients.filter((client) => client.isTrusted);
  const reviewConditional = conditionals.find((entry) => entry.id === reviewingConditionalId) ?? null;
  const receiptConditional = conditionals.find((entry) => entry.id === showReceiptForId) ?? null;

  useEffect(() => {
    setCheckoutDraft(readCheckoutDraft());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const [clientsPayload, productsPayload, conditionalsPayload, salesPayload, tenant] = await Promise.all([
          fetchClients(),
          fetchProducts(),
          fetchConditionals(),
          fetchSales(),
          fetchCurrentTenantSettings().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setClients(clientsPayload);
        setProducts(productsPayload);
        setConditionals(conditionalsPayload);
        setSales(salesPayload);
        setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
      } catch (error) {
        if (isMounted) {
          setFeedback(error instanceof Error ? error.message : "Falha ao carregar condicionais.");
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshConditionalsList() {
    const data = await fetchConditionals();
    setConditionals(data);
    return data;
  }

  useEffect(() => {
    if (!selectedConditionalId && conditionals.length > 0) {
      setSelectedConditionalId(conditionals[0].id);
    }
  }, [conditionals, selectedConditionalId]);

  useEffect(() => {
    if (selectedConditionalId && !conditionals.some((entry) => entry.id === selectedConditionalId)) {
      setSelectedConditionalId(conditionals[0]?.id ?? null);
    }
  }, [conditionals, selectedConditionalId]);

  useEffect(() => {
    if (queryHandledRef.current || typeof window === "undefined" || clients.length === 0) {
      return;
    }

    queryHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("clientId");
    const action = params.get("action");

    if (!clientId) {
      return;
    }

    setDraftClientId(clientId);

    const existingConditional = conditionals.find((entry) => entry.clientId === clientId && entry.status === "open");
    if (existingConditional) {
      setSelectedConditionalId(existingConditional.id);
      return;
    }

    if (action === "new") {
      setShowCreateModal(true);
    }
  }, [clients.length, conditionals]);

  const filteredConditionals = useMemo(() => {
    return conditionals.filter((conditional) => {
      const client = clients.find((entry) => entry.id === conditional.clientId);
      const haystack = `${client?.name ?? ""} ${conditional.id} ${conditional.notes ?? ""}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [clients, conditionals, searchTerm]);

  const metrics = useMemo(() => {
    const openRecords = conditionals.filter((entry) => entry.status === "open");
    const dueToday = openRecords.filter((entry) => getConditionalDerivedStatus(entry) === "due_today").length;
    const late = openRecords.filter((entry) => getConditionalDerivedStatus(entry) === "late").length;
    const converted = conditionals.filter((entry) => entry.status === "converted_full" || entry.status === "converted_partial").length;
    const closed = conditionals.filter((entry) => entry.status !== "open").length;
    const convertedValue = conditionals.reduce((sum, entry) => sum + getConditionalConvertedValue(entry), 0);
    const visitRevenue = conditionals.reduce((sum, entry) => sum + getConditionalVisitRevenue(entry, sales), 0);
    const additionalVisitRevenue = conditionals.reduce((sum, entry) => sum + getConditionalAdditionalVisitRevenue(entry, sales), 0);

    return {
      open: openRecords.length,
      dueToday,
      late,
      conversionRate: closed > 0 ? Math.round((converted / closed) * 100) : 0,
      convertedValue,
      visitRevenue,
      additionalVisitRevenue
    };
  }, [conditionals, sales]);

  const resetDraft = () => {
    setDraftClientId("");
    setDraftDueDate(todayPlusDays(7));
    setDraftNotes("");
    setDraftItems([]);
    setSelectedProductId("");
    setErrorMessage("");
  };

  const availableStock = (productId: string) => getAvailableStock(productId, products, conditionals);

  const handleAddDraftItem = (productId = selectedProductId) => {
    if (!productId) {
      return;
    }

    setSelectedProductId(productId);
    setErrorMessage("");
    setDraftItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      const max = availableStock(productId);
      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, qtySent: Math.min(max, item.qtySent + 1) }
            : item
        );
      }
      return [...current, { productId, qtySent: 1 }];
    });
  };

  const handleDraftQtyChange = (productId: string, delta: number) => {
    setDraftItems((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, qtySent: Math.min(availableStock(productId), Math.max(1, item.qtySent + delta)) }
            : item
        )
        .filter((item) => item.qtySent > 0)
    );
  };

  async function handleCreateConditional() {
    try {
      setFeedback(null);
      const created = await createConditional({
        clientId: draftClientId,
        dueDate: draftDueDate,
        notes: draftNotes,
        items: draftItems
      });

      const nextList = await refreshConditionalsList();
      const selectedId = created?.id ?? nextList[0]?.id ?? null;
      setSelectedConditionalId(selectedId);
      setShowCreateModal(false);
      if (selectedId) {
        setShowReceiptForId(selectedId);
      }
      resetDraft();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível criar o condicional.");
    }
  }

  async function handlePrintReceipt(conditional: ConditionalRecord) {
    const client = clients.find((entry) => entry.id === conditional.clientId);
    const rows = conditional.items
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${product?.name ?? item.productId}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.qtySent}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.unitPrice)}</td></tr>`;
      })
      .join("");

    const popup = window.open("", "_blank", "width=820,height=680");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html><body style="font-family:Georgia,serif;padding:32px;color:#2a2421;">
      <h1 style="letter-spacing:0.2em;text-transform:uppercase;">${storeLabel}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;color:#8c6d45;">Recibo de retirada em condicional</p>
      <p><strong>Cliente:</strong> ${client?.name ?? "-"}</p>
      <p><strong>Devolução prevista:</strong> ${new Date(`${conditional.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:24px;font-family:Arial,sans-serif;font-size:13px;">
      <thead><tr><th style="text-align:left;padding-bottom:10px;border-bottom:1px solid #ddd;">Produto</th><th style="text-align:center;padding-bottom:10px;border-bottom:1px solid #ddd;">Qtd.</th><th style="text-align:right;padding-bottom:10px;border-bottom:1px solid #ddd;">Valor</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:24px;"><strong>Valor enviado:</strong> ${formatCurrency(getConditionalValue(conditional))}</p>
      <div style="margin-top:64px;border-top:1px solid #999;padding-top:12px;font-family:Arial,sans-serif;">Assinatura do cliente</div>
      <script>
        window.onafterprint = function () {
          window.close();
        };

        window.addEventListener("load", function () {
          window.focus();
          window.print();
        });
      </script>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    setShowReceiptForId(null);

    try {
      await markConditionalReceiptPrinted(conditional.id);
      await refreshConditionalsList();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao marcar recibo.");
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#fdfbf7]">
      <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white px-6 md:px-10 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-3 text-[#2a2421] hover:text-[#8c6d45] transition-all group">
          <div className="rounded-full bg-[#b08d57]/10 p-2.5 group-hover:bg-[#b08d57]/20 transition-all border-2 border-[#b08d57]/20">
            <ArrowLeft className="h-4 w-4 stroke-[3px]" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Voltar</span>
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="font-serif text-3xl text-[#2a2421] tracking-[0.25em] uppercase">{storeLabel}</h1>
          <div className="h-[2px] w-12 bg-[#8c6d45] my-1" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Gestão de Condicionais</p>
          {feedback ? <p className="text-[10px] mt-2 text-[#8c6d45] font-bold">{feedback}</p> : null}
        </div>

        <button
          onClick={() => {
            resetDraft();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 rounded-full bg-[#8c6d45] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all"
        >
          <Plus className="h-4 w-4" />
          Novo condicional
        </button>
      </header>

      <section className="grid gap-4 border-b border-[#b08d57]/10 bg-white/70 px-6 py-5 md:grid-cols-3 xl:grid-cols-6 md:px-10">
        <MetricCard label="Em aberto" value={String(metrics.open)} />
        <MetricCard label="Vencem hoje" value={String(metrics.dueToday)} />
        <MetricCard label="Atrasados" value={String(metrics.late)} />
        <MetricCard label="Itens do condicional vendidos" value={formatCurrency(metrics.convertedValue)} />
        <MetricCard label="Venda total na visita" value={formatCurrency(metrics.visitRevenue)} />
        <MetricCard label="Venda adicional na visita" value={formatCurrency(metrics.additionalVisitRevenue)} />
      </section>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-full max-w-md flex-shrink-0 border-r-2 border-[#b08d57]/10 bg-white">
          <div className="border-b border-[#b08d57]/10 p-5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a69b8f] group-focus-within:text-[#b08d57] transition-colors" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cliente ou observação..."
                className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-[#fefcfb] py-3 pl-11 pr-4 text-sm font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-4 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="h-full overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredConditionals.map((conditional) => {
              const client = clients.find((entry) => entry.id === conditional.clientId);
              const derivedStatus = getConditionalDerivedStatus(conditional);
              const isSelected = conditional.id === selectedConditionalId;

              return (
                <button
                  key={conditional.id}
                  onClick={() => setSelectedConditionalId(conditional.id)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-[#8c6d45] bg-[#8c6d45] text-white shadow-xl shadow-[#8c6d45]/20"
                      : "border-[#b08d57]/15 bg-white hover:border-[#b08d57]/40 hover:bg-[#fdfbf7] shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-serif text-2xl truncate ${isSelected ? "text-white" : "text-[#2a2421]"}`}>
                        {client?.name ?? "Cliente"}
                      </p>
                      <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.25em] ${isSelected ? "text-white/75" : "text-[#8c6d45]"}`}>
                        {STATUS_LABELS[derivedStatus]}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      isSelected ? "bg-white/15 text-white border border-white/20" : "bg-[#f7f2ed] text-[#8c6d45] border border-[#b08d57]/20"
                    }`}>
                      {formatCurrency(getConditionalValue(conditional))}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredConditionals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                <ClipboardList className="mb-4 h-14 w-14 text-[#8c6d45]" />
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#5c4a33]">Nenhum condicional</p>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedConditional ? (
            <ConditionalDetail
              conditional={selectedConditional}
              client={clients.find((entry) => entry.id === selectedConditional.clientId) ?? null}
              products={products}
              sales={sales}
              checkoutDraftId={checkoutDraft?.originId}
              onOpenReceipt={() => setShowReceiptForId(selectedConditional.id)}
              onOpenReview={() => setReviewingConditionalId(selectedConditional.id)}
              onGoToCheckout={() => router.push("/caixa")}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-12 text-center opacity-40">
              <div>
                <ClipboardList className="mx-auto mb-5 h-16 w-16 text-[#8c6d45]" />
                <h2 className="font-serif text-4xl text-[#2a2421]">Selecione um condicional</h2>
              </div>
            </div>
          )}
        </main>
      </div>

      {showCreateModal ? (
        <ConditionalCreateModal
          trustedClients={trustedClients}
          products={products}
          availableStock={availableStock}
          clientId={draftClientId}
          dueDate={draftDueDate}
          notes={draftNotes}
          items={draftItems}
          selectedProductId={selectedProductId}
          errorMessage={errorMessage}
          onClose={() => setShowCreateModal(false)}
          onClientChange={setDraftClientId}
          onDueDateChange={setDraftDueDate}
          onNotesChange={setDraftNotes}
          onSelectedProductChange={setSelectedProductId}
          onAddItem={handleAddDraftItem}
          onQtyChange={handleDraftQtyChange}
          onSubmit={handleCreateConditional}
        />
      ) : null}

      {reviewConditional ? (
        <ConditionalReviewModal
          conditional={reviewConditional}
          products={products}
          onClose={() => setReviewingConditionalId(null)}
          onConfirm={async (soldQuantities) => {
            try {
              const totalSold = Object.values(soldQuantities).reduce((sum, qty) => sum + qty, 0);
              if (totalSold === 0) {
                await closeConditionalAsReturned(reviewConditional.id, soldQuantities);
                writeCheckoutDraft(null);
                setCheckoutDraft(null);
                await refreshConditionalsList();
                setReviewingConditionalId(null);
                return;
              }

              const draft = await prepareConditionalCheckout(reviewConditional.id, soldQuantities);
              writeCheckoutDraft(draft);
              setCheckoutDraft(draft);
              setReviewingConditionalId(null);
              router.push("/caixa");
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Falha ao revisar condicional.");
            }
          }}
        />
      ) : null}

      {receiptConditional ? (
        <ConditionalReceiptModal
          conditional={receiptConditional}
          client={clients.find((entry) => entry.id === receiptConditional.clientId) ?? null}
          products={products}
          onClose={() => setShowReceiptForId(null)}
          onPrint={() => handlePrintReceipt(receiptConditional)}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-5 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">{label}</p>
      <p className="mt-3 font-serif text-3xl text-[#2a2421]">{value}</p>
    </div>
  );
}

