"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileUp, Loader2, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import type { FiscalImportPreview, FiscalImportResolution } from "@/lib/fiscal/types";
import type { Product } from "@/types";
import { commitFiscalImport, fetchProducts, previewFiscalImport } from "@/lib/painel-api";

type ResolutionState = {
  productId: string;
  salePrice: string;
};

const NEW_PRODUCT_VALUE = "__new__";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPriceInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function normalizePriceInput(value: string) {
  const normalizedSource = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [integerPart = "", decimalRaw = ""] = normalizedSource.split(",");
  const decimalPart = decimalRaw.slice(0, 2);

  return decimalPart.length > 0 ? `${integerPart},${decimalPart}` : integerPart;
}

function parsePriceInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function resolveSelectedSalePrice(productId: string, products: Product[], fallbackPrice = 0) {
  if (productId === NEW_PRODUCT_VALUE) {
    return 0;
  }

  const selected = products.find((product) => product.id === productId);
  if (selected) {
    return Number(selected.price ?? 0);
  }

  return fallbackPrice;
}

export default function FiscalImportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [xmlContent, setXmlContent] = useState("");
  const [preview, setPreview] = useState<FiscalImportPreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ResolutionState>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        const payload = await fetchProducts();
        if (mounted) {
          setProducts(payload.filter((product) => !product.isDeleted));
        }
      } catch {
        if (mounted) {
          setProducts([]);
        }
      }
    }

    void loadProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const productOptions = useMemo(
    () => [...products].sort((first, second) => first.name.localeCompare(second.name, "pt-BR")),
    [products]
  );

  async function loadPreview(content: string) {
    setLoadingPreview(true);
    setError(null);
    setFeedback(null);

    try {
      const previewPayload = await previewFiscalImport(content);
      setXmlContent(content);
      setPreview(previewPayload);
      setResolutions(
        Object.fromEntries(
          previewPayload.items.map((item) => [
            item.sourceItemKey,
            {
              productId: item.matchedProduct?.id ?? NEW_PRODUCT_VALUE,
              salePrice: formatPriceInput(item.matchedProduct?.price ?? 0)
            }
          ])
        )
      );
    } catch (loadError) {
      setPreview(null);
      setXmlContent("");
      setResolutions({});
      setError(loadError instanceof Error ? loadError.message : "Falha ao ler XML.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleFile(file: File) {
    try {
      const content = await file.text();
      await loadPreview(content);
    } catch (loadError) {
      setPreview(null);
      setXmlContent("");
      setResolutions({});
      setError(loadError instanceof Error ? loadError.message : "Falha ao ler XML.");
    }
  }

  async function handlePasteData(event: ClipboardEvent | React.ClipboardEvent<HTMLElement>) {
    const clipboardData = "clipboardData" in event ? event.clipboardData : null;
    if (!clipboardData) {
      return;
    }

    const files = Array.from(clipboardData.files ?? []);
    const xmlFile = files.find((file) => /xml/i.test(file.type) || file.name.toLowerCase().endsWith(".xml"));
    if (xmlFile) {
      event.preventDefault();
      await handleFile(xmlFile);
      return;
    }

    const pastedText = clipboardData.getData("text/plain").trim();
    if (pastedText.startsWith("<")) {
      event.preventDefault();
      await loadPreview(pastedText);
    }
  }

  useEffect(() => {
    async function handleWindowPaste(event: ClipboardEvent) {
      await handlePasteData(event);
    }

    window.addEventListener("paste", handleWindowPaste);
    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, []);

  function updateResolution(sourceItemKey: string, patch: Partial<ResolutionState>) {
    setResolutions((current) => ({
      ...current,
      [sourceItemKey]: {
        ...current[sourceItemKey],
        ...patch
      }
    }));
  }

  function handleSalePriceChange(sourceItemKey: string, rawValue: string) {
    updateResolution(sourceItemKey, { salePrice: normalizePriceInput(rawValue) });
  }

  function handleSalePriceBlur(sourceItemKey: string) {
    setResolutions((current) => {
      const resolution = current[sourceItemKey];
      if (!resolution) {
        return current;
      }

      return {
        ...current,
        [sourceItemKey]: {
          ...resolution,
          salePrice: formatPriceInput(parsePriceInput(resolution.salePrice))
        }
      };
    });
  }

  const hasInvalidResolution = preview?.items.some((item) => {
    const resolution = resolutions[item.sourceItemKey];
    if (!resolution) {
      return true;
    }

    if (item.lockedByEan && !item.matchedProduct?.id) {
      return true;
    }

    if (!item.lockedByEan && !resolution.productId) {
      return true;
    }

    return false;
  }) ?? false;

  async function handleCommit() {
    if (!preview) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: FiscalImportResolution[] = preview.items.map((item) => {
        const resolution = resolutions[item.sourceItemKey];
        const salePrice = parsePriceInput(resolution?.salePrice ?? "");

        return {
          sourceItemKey: item.sourceItemKey,
          action: item.lockedByEan
            ? "update_existing"
            : resolution?.productId === NEW_PRODUCT_VALUE
              ? "create_new"
              : "update_existing",
          productId: item.lockedByEan
            ? item.matchedProduct?.id ?? null
            : resolution?.productId === NEW_PRODUCT_VALUE
              ? null
              : resolution?.productId || null,
          salePrice: salePrice ?? 0,
          updateName: false
        };
      });

      const result = await commitFiscalImport(xmlContent, payload);
      setFeedback(`${result.updatedProducts} atualizado(s) e ${result.createdProducts} criado(s).`);
      router.push(`/fiscal/${result.invoiceId}`);
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Falha ao concluir importação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f2eb] px-4 py-8 md:px-8">
      <div className={`mx-auto max-w-6xl space-y-6 ${preview ? "pb-28 md:pb-32" : ""}`}>
        <header className="rounded-[2rem] border border-[#b08d57]/15 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/fiscal"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b08d57]/20 text-[#8c6d45] transition hover:bg-[#f7f2ed]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">Importação Fiscal</p>
              <h1 className="font-serif text-3xl text-[#2a2421]">Importar XML de NF-e</h1>
              <p className="text-sm text-[#7a6a58]">Revise a conciliação antes de gravar estoque, produtos e histórico fiscal.</p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {feedback}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 shadow-sm">
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />

          <button
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              const nextTarget = event.relatedTarget as Node | null;
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                setIsDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = Array.from(event.dataTransfer.files).find(
                (entry) => /xml/i.test(entry.type) || entry.name.toLowerCase().endsWith(".xml")
              );
              if (file) {
                void handleFile(file);
              }
            }}
            onPaste={(event) => {
              void handlePasteData(event);
            }}
            type="button"
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed px-6 py-10 text-center text-[#8c6d45] transition ${
              isDragging
                ? "border-[#8c6d45]/60 bg-[#f7f2ed]"
                : "border-[#b08d57]/30 bg-[#faf8f5] hover:border-[#8c6d45]/50 hover:bg-[#f7f2ed]"
            }`}
          >
            {loadingPreview ? <Loader2 className="h-10 w-10 animate-spin" /> : <Upload className="h-10 w-10" />}
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em]">
                {isDragging ? "Solte o XML aqui" : "Selecionar XML"}
              </p>
              <p className="mt-2 text-sm text-[#7a6a58]">
                Arraste, clique para escolher ou cole o XML aqui. Aceita apenas NF-e de entrada modelo 55 nesta etapa.
              </p>
            </div>
          </button>
        </section>

        {preview ? (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Resumo da Nota</p>
                <div className="mt-4 space-y-3 text-sm text-[#2a2421]">
                  <p><span className="font-bold">Chave:</span> {preview.accessKey}</p>
                  <p><span className="font-bold">Fornecedor:</span> {preview.document.issuer.name || "-"}</p>
                  <p><span className="font-bold">Número:</span> {preview.document.number || "-"} / Série {preview.document.series || "-"}</p>
                  <p><span className="font-bold">Total:</span> {formatCurrency(preview.document.totals.invoice)}</p>
                  <p><span className="font-bold">Itens:</span> {preview.items.length}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Validação</p>
                <div className="mt-4 space-y-3 text-sm text-[#2a2421]">
                  <p><span className="font-bold">Modelo:</span> {preview.document.documentModel || "-"}</p>
                  <p><span className="font-bold">Ambiente:</span> {preview.document.environment}</p>
                  <p><span className="font-bold">Destinatario:</span> {preview.document.recipient?.name || "-"}</p>
                  {preview.duplicateInvoiceId ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                      Esta chave já existe no histórico fiscal do tenant.
                    </p>
                  ) : (
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                      Nota pronta para conciliação assistida.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#b08d57]/15 bg-white shadow-sm">
              <div className="border-b border-[#b08d57]/10 px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-[#8c6d45]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Conciliação Assistida</p>
                </div>
              </div>

              <div className="space-y-3 p-6">
                {preview.items.map((item) => {
                  const resolution = resolutions[item.sourceItemKey];
                  const matchedProduct = item.matchedProduct;
                  const isPerfectMatch = item.lockedByEan && Boolean(matchedProduct);
                  const selectedProductId = isPerfectMatch ? matchedProduct?.id ?? "" : resolution?.productId ?? "";
                  const selectedProduct =
                    !isPerfectMatch && selectedProductId && selectedProductId !== NEW_PRODUCT_VALUE
                      ? productOptions.find((product) => product.id === selectedProductId) ?? null
                      : null;
                  const helperText = isPerfectMatch
                    ? "Preço atual carregado do produto encontrado."
                    : selectedProductId === NEW_PRODUCT_VALUE
                      ? "Novo produto será criado com este preço de venda."
                      : selectedProduct
                        ? "Preço atual carregado do produto selecionado."
                        : null;

                  return (
                    <div key={item.sourceItemKey} className="rounded-xl border border-[#b08d57]/15 bg-[#fcfbf8] p-3 md:p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,280px)_150px] md:items-start">
                        <div>
                          <p className="font-semibold text-[#2a2421] md:truncate">
                            {item.descricao}
                            {isPerfectMatch && matchedProduct ? (
                              <span className="ml-2 inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 align-middle">
                                Produto encontrado
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-[#8c7b68] md:truncate">
                            Código {item.codigo} • EAN {item.ean || "-"} • NCM {item.ncm || "-"} • CFOP {item.cfop || "-"}
                          </p>
                          <p className="mt-1 text-sm text-[#5c4a33]">
                            {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                          </p>
                          {!isPerfectMatch && matchedProduct ? (
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              Sugestão: {matchedProduct.name}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">
                            Selecione o produto
                          </label>
                          {isPerfectMatch && matchedProduct ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-700">
                              <p className="truncate font-semibold">{matchedProduct.name}</p>
                              <p className="mt-0.5 text-[10px] font-medium uppercase text-emerald-700/80">
                                {matchedProduct.ean || "Sem EAN"} • Estoque {matchedProduct.stock}
                              </p>
                            </div>
                          ) : (
                            <select
                              value={selectedProductId}
                              onChange={(event) => {
                                const nextProductId = event.target.value;
                                updateResolution(item.sourceItemKey, {
                                  productId: nextProductId,
                                  salePrice: formatPriceInput(
                                    resolveSelectedSalePrice(nextProductId, productOptions, matchedProduct?.price ?? 0)
                                  )
                                });
                              }}
                              className="w-full rounded-xl border border-[#b08d57]/20 bg-white px-3 py-2 text-sm text-[#2a2421] outline-none focus:border-[#8c6d45]"
                            >
                              <option value={NEW_PRODUCT_VALUE}>Produto Novo</option>
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.ean ? `• ${product.ean}` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                          {helperText ? (
                            <p className="mt-1 text-[10px] text-[#8c7b68]">{helperText}</p>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">
                            Preço de venda
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={resolution?.salePrice ?? "0,00"}
                            onChange={(event) => handleSalePriceChange(item.sourceItemKey, event.target.value)}
                            onBlur={() => handleSalePriceBlur(item.sourceItemKey)}
                            className="w-full rounded-xl border border-[#b08d57]/20 bg-white px-3 py-2 text-sm text-[#2a2421] outline-none focus:border-[#8c6d45]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}
      </div>

      {preview ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[1.75rem] border border-[#b08d57]/15 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(70,52,28,0.10)] backdrop-blur">
              <button
                onClick={handleCommit}
                disabled={saving || hasInvalidResolution || Boolean(preview.duplicateInvoiceId)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8c6d45] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#725a38] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
