"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileUp, RefreshCw } from "lucide-react";

import type { FiscalInvoiceSummary } from "@/lib/fiscal/types";
import { fetchFiscalInvoices } from "@/lib/painel-api";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

export default function FiscalPage() {
  const [invoices, setInvoices] = useState<FiscalInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError(null);
      setInvoices(await fetchFiscalInvoices());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar notas fiscais.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f2eb] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[#b08d57]/15 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/produtos"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b08d57]/20 text-[#8c6d45] transition hover:bg-[#f7f2ed]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">Fiscal</p>
              <h1 className="font-serif text-3xl text-[#2a2421]">Notas Importadas</h1>
              <p className="text-sm text-[#7a6a58]">Histórico de XML de entrada para estoque, contador e devolução futura.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadInvoices()}
              className="inline-flex items-center gap-2 rounded-full border border-[#b08d57]/20 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#5c4a33] transition hover:bg-[#f7f2ed]"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <Link
              href="/fiscal/importar"
              className="inline-flex items-center gap-2 rounded-full bg-[#8c6d45] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#725a38]"
            >
              <FileUp className="h-4 w-4" />
              Importar XML
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-[#b08d57]/15 bg-white shadow-sm">
          <div className="border-b border-[#b08d57]/10 px-6 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8c6d45]">
              {loading ? "Carregando..." : `${invoices.length} nota(s) encontrada(s)`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-[#7a6a58]">Carregando notas fiscais...</div>
          ) : invoices.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[#7a6a58]">Nenhuma nota importada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">
                  <tr>
                    <th className="px-6 py-4">Nota</th>
                    <th className="px-6 py-4">Fornecedor</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Itens</th>
                    <th className="px-6 py-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[#b08d57]/10 text-[#2a2421]">
                      <td className="px-6 py-4">
                        <Link href={`/fiscal/${invoice.id}`} className="font-bold text-[#5c4a33] transition hover:text-[#8c6d45]">
                          NF {invoice.number || "-"} / Série {invoice.series || "-"}
                        </Link>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-[#8c7b68]">{invoice.accessKey}</p>
                      </td>
                      <td className="px-6 py-4">{invoice.issuerName || "-"}</td>
                      <td className="px-6 py-4">{formatDate(invoice.issueDate)}</td>
                      <td className="px-6 py-4 font-semibold">{formatCurrency(invoice.totalInvoiceAmount)}</td>
                      <td className="px-6 py-4">{invoice.itemCount}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/fiscal/${invoice.id}`}
                            className="rounded-full border border-[#b08d57]/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#5c4a33] transition hover:bg-[#f7f2ed]"
                          >
                            Ver
                          </Link>
                          <a
                            href={`/api/fiscal/invoices/${invoice.id}/xml`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#b08d57]/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#5c4a33] transition hover:bg-[#f7f2ed]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            XML
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
