"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, Search, X } from "lucide-react";
import { Client, Product } from "@/types";
import { formatCurrency } from "@/lib/utils";

export type DraftConditionalItem = {
  productId: string;
  qtySent: number;
};

type ScanFeedback = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function ConditionalCreateModal({
  trustedClients,
  products,
  availableStock,
  clientId,
  dueDate,
  notes,
  items,
  selectedProductId,
  errorMessage,
  onClose,
  onClientChange,
  onDueDateChange,
  onNotesChange,
  onSelectedProductChange,
  onAddItem,
  onQtyChange,
  onSubmit
}: {
  trustedClients: Client[];
  products: Product[];
  availableStock: (productId: string) => number;
  clientId: string;
  dueDate: string;
  notes: string;
  items: DraftConditionalItem[];
  selectedProductId: string;
  errorMessage: string;
  onClose: () => void;
  onClientChange: (clientId: string) => void;
  onDueDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onSelectedProductChange: (productId: string) => void;
  onAddItem: (productId?: string) => void;
  onQtyChange: (productId: string, delta: number) => void;
  onSubmit: () => void;
}) {
  const selectableProducts = products.filter((product) => !product.isDeleted && availableStock(product.id) > 0);
  const totalValue = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product?.price ?? 0) * item.qtySent;
  }, 0);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [scannerValue, setScannerValue] = useState("");
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>({
    tone: "idle",
    message: ""
  });

  useEffect(() => {
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const selectedClient = trustedClients.find((client) => client.id === clientId) ?? null;
    setClientSearchTerm(selectedClient?.name ?? "");
  }, [clientId, trustedClients]);

  const normalizedClientNeedle = clientSearchTerm.trim().toLowerCase();
  const filteredClients = normalizedClientNeedle.length >= 2
    ? trustedClients
      .filter((client) => {
        const normalizedPhone = client.phone.replace(/\D/g, "");
        const normalizedCpf = (client.cpf ?? "").replace(/\D/g, "");
        const digitsNeedle = clientSearchTerm.replace(/\D/g, "");

        return (
          client.name.toLowerCase().includes(normalizedClientNeedle) ||
          client.instagram.toLowerCase().includes(normalizedClientNeedle) ||
          (digitsNeedle.length > 0 && normalizedPhone.includes(digitsNeedle)) ||
          (digitsNeedle.length > 0 && normalizedCpf.includes(digitsNeedle))
        );
      })
      .slice(0, 8)
    : [];
  const selectedClient = trustedClients.find((client) => client.id === clientId) ?? null;
  const trimmedScannerValue = scannerValue.trim();
  const isCodeInput = /^\d{8,14}$/.test(trimmedScannerValue);
  const manualSearchResults = trimmedScannerValue.length >= 2 && !isCodeInput
    ? selectableProducts
      .filter((product) => {
        const normalizedNeedle = trimmedScannerValue.toLowerCase();
        return (
          product.name.toLowerCase().includes(normalizedNeedle) ||
          product.category.toLowerCase().includes(normalizedNeedle) ||
          product.ean.includes(trimmedScannerValue)
        );
      })
      .slice(0, 6)
    : [];

  const setScannerIdle = () => {
    setScanFeedback({
      tone: "idle",
      message: ""
    });
  };

  const getScanCandidates = (rawValue: string) => {
    const normalized = rawValue.trim();
    const candidates = new Set<string>();

    const pushCandidate = (value?: string | null) => {
      const parsed = value?.trim();
      if (!parsed) {
        return;
      }

      candidates.add(parsed);
      candidates.add(parsed.toLowerCase());
    };

    pushCandidate(normalized);

    try {
      pushCandidate(decodeURIComponent(normalized));
    } catch {}

    const numericChunks = normalized.match(/\d{8,14}/g) ?? [];
    numericChunks.forEach((chunk) => pushCandidate(chunk));

    const slugChunks = normalized.match(/[a-z0-9]+(?:-[a-z0-9]+)+/gi) ?? [];
    slugChunks.forEach((chunk) => pushCandidate(chunk));

    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      try {
        const url = new URL(normalized);
        ["ean", "id", "productId", "code", "codigo", "sku"].forEach((key) => {
          pushCandidate(url.searchParams.get(key));
        });

        const pathSegments = url.pathname.split("/").filter(Boolean);
        pushCandidate(pathSegments[pathSegments.length - 1]);
      } catch {}
    }

    return candidates;
  };

  const findProductByScanCode = (rawValue: string) => {
    const candidates = getScanCandidates(rawValue);

    return selectableProducts.find((product) => {
      return candidates.has(product.ean) || candidates.has(product.id) || candidates.has(product.id.toLowerCase());
    });
  };

  const handleScannerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const scannedCode = scannerValue.trim();
    if (!scannedCode) {
      return;
    }

    const product = findProductByScanCode(scannedCode) ?? (!isCodeInput && manualSearchResults.length === 1 ? manualSearchResults[0] : undefined);

    if (!product) {
      setScanFeedback({
        tone: "error",
        message: "Código não localizado. Tente EAN, ID do produto ou QR vinculado."
      });
      setScannerValue("");
      scannerInputRef.current?.focus();
      return;
    }

    if (availableStock(product.id) <= 0) {
      setScanFeedback({
        tone: "error",
        message: `${product.name} está sem estoque disponível agora.`
      });
      setScannerValue("");
      scannerInputRef.current?.focus();
      return;
    }

    onSelectedProductChange(product.id);
    onAddItem(product.id);
    setScannerValue("");
    setScanFeedback({
      tone: "success",
      message: `${product.name} adicionado ao condicional.`
    });
    scannerInputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a2421]/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[2.5rem] border-2 border-[#b08d57]/20 bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 md:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8c6d45]">Nova saída em condicional</p>
            <h2 className="mt-2 font-serif text-4xl text-[#2a2421]">Montar retirada</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[#b08d57]/20 p-3 text-[#8c6d45] transition-all hover:bg-[#f7f2ed]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">Cliente liberado</span>
                <div className="space-y-2">
                  {!selectedClient ? (
                    <div className="flex items-center gap-2 rounded-2xl border-2 border-[#b08d57]/20 bg-[#fefcfb] px-4 py-4 shadow-sm focus-within:border-[#8c6d45] transition-all">
                      <Search className="h-4 w-4 text-[#b08d57]" />
                      <input
                        type="text"
                        value={clientSearchTerm}
                        onChange={(event) => {
                          setClientSearchTerm(event.target.value);
                          if (clientId) {
                            onClientChange("");
                          }
                        }}
                        placeholder="Buscar por nome, telefone, CPF ou Instagram"
                        className="flex-1 bg-transparent text-sm font-bold text-[#2a2421] placeholder-[#a69b8f] focus:outline-none"
                      />
                    </div>
                  ) : null}

                  {selectedClient ? (
                    <div className="flex items-center justify-between rounded-2xl border border-[#b08d57]/15 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-[#2a2421]">{selectedClient.name}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#8c6d45]">
                          {selectedClient.phone || selectedClient.instagram || selectedClient.cpf || "Cliente liberado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClientChange("");
                          setClientSearchTerm("");
                        }}
                        className="rounded-full border border-[#b08d57]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#5c4a33] transition-all hover:bg-[#f7f2ed]"
                      >
                        Limpar
                      </button>
                    </div>
                  ) : null}

                  {normalizedClientNeedle.length >= 2 && !selectedClient ? (
                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#b08d57]/15 bg-white p-2">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              onClientChange(client.id);
                              setClientSearchTerm(client.name);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-[#f7f2ed]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#2a2421]">{client.name}</p>
                              <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#8c6d45]">
                                {client.phone || client.instagram || client.cpf || "Sem dado complementar"}
                              </p>
                            </div>
                            {clientId === client.id ? (
                              <span className="rounded-full bg-[#8c6d45] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                Selecionado
                              </span>
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">Nenhum cliente encontrado</p>
                          <p className="mt-1 text-sm text-[#a69b8f]">Tente outro nome, telefone, CPF ou Instagram.</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">Devolução prevista</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => onDueDateChange(event.target.value)}
                  className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-[#fefcfb] px-4 py-4 text-sm font-bold text-[#2a2421] focus:border-[#8c6d45] focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">Observações</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-[#fefcfb] px-4 py-4 text-sm font-medium text-[#2a2421] focus:border-[#8c6d45] focus:outline-none"
                placeholder="Ex: cliente vai testar na sala e na varanda."
              />
            </label>

            <div className="rounded-[2rem] border border-[#b08d57]/15 bg-[#fdfbf7] p-5">
              <form onSubmit={handleScannerSubmit} className="grid gap-3 md:grid-cols-[1fr,auto]">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45]">
                    Bipar codigo ou buscar produto
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[#a69b8f]">
                      <Search className="h-4 w-4" />
                      <Barcode className="h-4 w-4" />
                    </div>
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={scannerValue}
                      onChange={(event) => {
                        setScannerValue(event.target.value);
                        if (scanFeedback.tone !== "idle") {
                          setScannerIdle();
                        }
                      }}
                      placeholder="Aproxime o leitor ou digite o nome do produto"
                      className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-white py-4 pl-16 pr-4 text-sm font-bold text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  className="rounded-2xl bg-[#8c6d45] px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-[#725a38] md:self-end"
                >
                  Bipar item
                </button>
              </form>

              {trimmedScannerValue.length >= 2 && !isCodeInput ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#b08d57]/10 bg-white">
                  {manualSearchResults.length > 0 ? (
                    <div className="p-2">
                      {manualSearchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            onSelectedProductChange(product.id);
                            onAddItem(product.id);
                            setScannerValue("");
                            setScanFeedback({
                              tone: "success",
                              message: `${product.name} adicionado ao condicional.`
                            });
                            scannerInputRef.current?.focus();
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-[#f7f2ed]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#2a2421]">{product.name}</p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">{product.category}</p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a69b8f]">
                            Disp. {availableStock(product.id)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">Nenhum produto encontrado</p>
                      <p className="mt-1 text-sm text-[#a69b8f]">Tente outro nome ou use o codigo do item.</p>
                    </div>
                  )}
                </div>
              ) : null}

              {scanFeedback.tone === "error" ? (
                <div
                  className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {scanFeedback.message}
                </div>
              ) : null}


              <div className="mt-5 space-y-3">
                {items.map((item) => {
                  const product = products.find((entry) => entry.id === item.productId);
                  return (
                    <div key={item.productId} className="flex items-center gap-4 rounded-2xl border border-[#b08d57]/10 bg-white p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-xl text-[#2a2421]">{product?.name ?? item.productId}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">
                          disponível agora: {availableStock(item.productId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onQtyChange(item.productId, -1)}
                          className="h-10 w-10 rounded-full border border-[#b08d57]/20 text-[#8c6d45] transition-all hover:bg-[#f7f2ed]"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-[#2a2421]">{item.qtySent}</span>
                        <button
                          onClick={() => onQtyChange(item.productId, 1)}
                          className="h-10 w-10 rounded-full bg-[#8c6d45] text-white transition-all hover:bg-[#725a38]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#b08d57]/20 px-4 py-8 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#a69b8f]">
                    Adicione os itens levados pelo cliente
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[#b08d57]/15 bg-[#fefcfb] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">Resumo do condicional</p>
            <div className="mt-6 space-y-4">
              <SummaryLine label="Cliente" value={trustedClients.find((entry) => entry.id === clientId)?.name ?? "Não definido"} />
              <SummaryLine
                label="Devolução"
                value={dueDate ? new Date(`${dueDate}T00:00:00`).toLocaleDateString("pt-BR") : "Obrigatória"}
              />
              <SummaryLine label="Itens" value={`${items.reduce((sum, item) => sum + item.qtySent, 0)} unidades`} />
              <SummaryLine label="Valor enviado" value={formatCurrency(totalValue)} />
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border-2 border-[#b08d57]/20 py-3.5 text-xs font-black uppercase tracking-widest text-[#5c4a33] transition-all hover:bg-[#f7f2ed]"
              >
                Cancelar
              </button>
              <button
                onClick={onSubmit}
                className="flex-1 rounded-2xl bg-[#8c6d45] py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 transition-all hover:bg-[#725a38]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#b08d57]/10 pb-3">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6d45]">{label}</span>
      <span className="text-right text-sm font-bold text-[#2a2421]">{value}</span>
    </div>
  );
}



