"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useParams } from "next/navigation";

import type { FiscalInvoiceDetail } from "@/lib/fiscal/types";
import { fetchFiscalInvoice } from "@/lib/painel-api";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR");
}

export default function FiscalDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<FiscalInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvoice() {
      try {
        setLoading(true);
        setError(null);
        const payload = await fetchFiscalInvoice(params.id);
        if (mounted) {
          setInvoice(payload);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar nota fiscal.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInvoice();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-[#f6f2eb] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[#b08d57]/15 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/fiscal"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b08d57]/20 text-[#8c6d45] transition hover:bg-[#f7f2ed]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">Detalhe Fiscal</p>
              <h1 className="font-serif text-3xl text-[#2a2421]">
                {loading ? "Carregando..." : `NF ${invoice?.number || "-"} / Serie ${invoice?.series || "-"}`}
              </h1>
              <p className="text-sm text-[#7a6a58]">Confira XML, fornecedor, totais e itens importados.</p>
            </div>
          </div>

          {invoice ? (
            <a
              href={`/api/fiscal/invoices/${invoice.id}/xml`}
              className="inline-flex items-center gap-2 rounded-full bg-[#8c6d45] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#725a38]"
            >
              <Download className="h-4 w-4" />
              Baixar XML
            </a>
          ) : null}
        </header>

        {error ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 text-sm text-[#7a6a58] shadow-sm">
            Carregando dados da nota...
          </div>
        ) : invoice ? (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Cabecalho</p>
                <div className="mt-4 space-y-3 text-sm text-[#2a2421]">
                  <p><span className="font-bold">Chave:</span> {invoice.accessKey}</p>
                  <p><span className="font-bold">Emissao:</span> {formatDate(invoice.issueDate)}</p>
                  <p><span className="font-bold">Entrada:</span> {formatDate(invoice.entryDate)}</p>
                  <p><span className="font-bold">Natureza:</span> {invoice.natureOperation || "-"}</p>
                  <p><span className="font-bold">Total:</span> {formatCurrency(invoice.totalInvoiceAmount)}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Partes</p>
                <div className="mt-4 space-y-4 text-sm text-[#2a2421]">
                  <div>
                    <p className="font-bold">Emitente</p>
                    <p>{invoice.issuerName || "-"}</p>
                    <p className="text-[#7a6a58]">{invoice.issuerDocument || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold">Destinatario</p>
                    <p>{invoice.recipientName || "-"}</p>
                    <p className="text-[#7a6a58]">{invoice.recipientDocument || "-"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#b08d57]/15 bg-white shadow-sm">
              <div className="border-b border-[#b08d57]/10 px-6 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">Itens Importados</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">
                    <tr>
                      <th className="px-6 py-4">Descricao</th>
                      <th className="px-6 py-4">Codigo</th>
                      <th className="px-6 py-4">Qtd</th>
                      <th className="px-6 py-4">Unitario</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-t border-[#b08d57]/10 text-[#2a2421]">
                        <td className="px-6 py-4">
                          <p className="font-semibold">{item.descricao}</p>
                          <p className="mt-1 text-xs text-[#8c7b68]">
                            EAN {item.ean || "-"} • NCM {item.ncm || "-"} • CFOP {item.cfop || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4">{item.codigo || "-"}</td>
                        <td className="px-6 py-4">{item.quantity}</td>
                        <td className="px-6 py-4">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4">{formatCurrency(item.totalPrice)}</td>
                        <td className="px-6 py-4">{item.actionTaken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
