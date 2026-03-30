"use client";

import { Calendar, MapPin, ExternalLink, Gift, Plus, Check, RotateCcw, RefreshCcw, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type GiftItemStatus } from "@/types";
import type { GiftListItemRecord, GiftListRecord } from "@/lib/gift-lists/types";
import { cancelGiftListItemReservation, regenerateGiftListToken } from "@/lib/painel-api";

interface GiftListDetailProps {
  list: GiftListRecord | null;
  onUpdate: (list: GiftListRecord) => void;
}

export function GiftListDetail({ list, onUpdate }: GiftListDetailProps) {
  const [formData, setFormData] = useState<GiftListRecord | null>(list);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [hostLinkToken, setHostLinkToken] = useState<string | null>(null);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  useEffect(() => {
    setFormData(list);
  }, [list]);

  if (!list || !formData) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center opacity-30 bg-[#fefcfb]">
        <Gift className="h-20 w-20 mb-4 stroke-1 text-[#8c6d45]" />
        <h3 className="font-serif text-2xl text-[#2a2421]">Nenhuma lista selecionada</h3>
        <p className="max-w-xs mt-3 text-sm font-medium uppercase tracking-[0.2em] text-[#8c6d45]">
          Selecione uma lista de presentes ao lado para visualizar os itens e detalhes.
        </p>
      </div>
    );
  }

  const statusColors = {
    disponivel: "bg-green-100 text-green-700 border-green-200",
    reservado: "bg-amber-100 text-amber-700 border-amber-200",
    comprado: "bg-blue-100 text-blue-700 border-blue-200"
  };

  const statusLabels: Record<GiftItemStatus, string> = {
    disponivel: "Disponível",
    reservado: "Reservado",
    comprado: "Comprado"
  };
  const currentGiftListId = formData.id;
  const summary = {
    disponivel: formData.items.filter((item) => item.status === "disponivel").length,
    reservado: formData.items.filter((item) => item.status === "reservado").length,
    comprado: formData.items.filter((item) => item.status === "comprado").length,
    valorEstimado: formData.items.reduce((acc, item) => acc + (item.product?.price ?? 0), 0)
  };

  async function handleCancelReservation(itemId: string) {
    try {
      setProcessingItemId(itemId);
      const updated = await cancelGiftListItemReservation(currentGiftListId, itemId);

      if (!updated) {
        throw new Error("Não foi possível atualizar a lista.");
      }

      setFormData(updated);
      onUpdate(updated);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao cancelar a reserva.");
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleRegenerateToken() {
    if (!window.confirm("Gerar um novo link irá invalidar o link anterior imediatamente. Tem certeza?")) {
      return;
    }
    
    try {
      setIsRegeneratingToken(true);
      const result = await regenerateGiftListToken(currentGiftListId);
      if (!result.giftList || !result.hostAccessToken) {
        throw new Error("Não foi possível gerar um novo link.");
      }
      setHostLinkToken(result.hostAccessToken);
      setFormData(result.giftList);
      onUpdate(result.giftList);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao gerar o token.");
    } finally {
      setIsRegeneratingToken(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between px-8 pt-8 md:px-12 md:pt-14 border-b border-[#b08d57]/10 pb-10 bg-[#fdfbf7]/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
          <img src={formData.photo} className="w-full h-full object-cover grayscale" alt="" />
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 z-10">
          <div className="relative">
            <div className="relative h-28 w-28 md:h-36 md:w-36 overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl rotate-2 transition-transform hover:rotate-0 duration-500">
              <img
                src={formData.photo}
                className="h-full w-full object-cover scale-110"
                alt={formData.brideName}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#8c6d45] border-4 border-white flex items-center justify-center text-white shadow-lg">
              <Gift className="h-5 w-5" />
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left pt-2">
            <h2 className="font-serif text-4xl md:text-6xl text-[#2a2421] tracking-tight mb-2 leading-tight">
              {formData.brideName}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#8c6d45]">
                <Calendar className="h-4 w-4" />
                {new Date(formData.eventDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-[#b08d57]/20" />
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#8c6d45]">
                <MapPin className="h-4 w-4" />
                {formData.city}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-0 flex flex-col items-center md:items-end gap-3 z-10 w-full md:w-auto">
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
            <button
              onClick={handleRegenerateToken}
              disabled={isRegeneratingToken}
              className="flex items-center gap-3 rounded-full bg-white border-2 border-[#b08d57]/20 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] hover:border-[#b08d57]/40 transition-all shadow-sm group disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${isRegeneratingToken ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
              {isRegeneratingToken ? "Gerando..." : "Gerar Link de Anfitrião"}
            </button>
            <a
              href={`/lista/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-full bg-white border-2 border-[#b08d57]/20 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] hover:border-[#b08d57]/40 transition-all shadow-sm group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Ver tela dos convidados
            </a>
          </div>

          {hostLinkToken && (
            <div className="animate-in fade-in slide-in-from-top-2 p-5 bg-amber-50 border-2 border-amber-200 rounded-[2rem] shadow-xl w-full max-w-md mt-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[11px] font-black uppercase text-amber-800 tracking-widest">Novo Link Gerado!</p>
                <button onClick={() => setHostLinkToken(null)} className="text-amber-600 hover:text-amber-900 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[10px] text-amber-700 italic mb-4 leading-relaxed">
                Copie este link agora. Por medidas de segurança, ele não será exibido caso você recarregue ou feche a página.
              </p>
              <div className="flex bg-white border-2 border-amber-200 rounded-2xl overflow-hidden p-1 shadow-sm">
                <input 
                  readOnly 
                  value={`${window.location.origin}/lista/${formData.slug}/editar?token=${hostLinkToken}`} 
                  className="flex-1 px-4 py-2 text-xs font-semibold text-[#2a2421] bg-transparent outline-none truncate"
                  onFocus={(e) => e.target.select()}
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lista/${formData.slug}/editar?token=${hostLinkToken}`)}
                  className="flex items-center justify-center bg-amber-600 text-white rounded-xl px-4 py-2 hover:bg-amber-700 transition-colors text-[10px] font-black uppercase tracking-widest gap-2"
                  title="Copiar Link"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 md:p-12 custom-scrollbar">
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.6rem] border border-[#b08d57]/10 bg-[#fdfbf7] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">Disponíveis</p>
              <p className="mt-3 font-serif text-4xl text-ink">{summary.disponivel}</p>
            </div>
            <div className="rounded-[1.6rem] border border-[#b08d57]/10 bg-[#fdfbf7] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">Reservados</p>
              <p className="mt-3 font-serif text-4xl text-ink">{summary.reservado}</p>
            </div>
            <div className="rounded-[1.6rem] border border-[#b08d57]/10 bg-[#fdfbf7] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">Comprados</p>
              <p className="mt-3 font-serif text-4xl text-ink">{summary.comprado}</p>
            </div>
            <div className="rounded-[1.6rem] border border-[#b08d57]/10 bg-[#fdfbf7] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">Valor estimado</p>
              <p className="mt-3 font-serif text-2xl text-[#8c6d45]">
                R$ {summary.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </section>

          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-serif text-3xl text-[#2a2421]">Itens Escolhidos</h3>
              <span className="rounded-full bg-[#8c6d45]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest leading-none text-[#8c6d45]">
                {formData.items.length} ITENS
              </span>
            </div>
            <button className="flex items-center gap-3 rounded-full bg-[#8c6d45] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#8c6d45]/20 transition-all hover:bg-[#725a38] hover:scale-105 active:scale-95">
              <Plus className="h-4 w-4" />
              Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item: GiftListItemRecord) => {
              const product = item.product;
              const productImage = product?.images[product.mainImageIndex] ?? product?.images[0] ?? formData.photo;
              const productName = product?.name ?? "Produto indisponível";
              const productPrice = product?.price ?? 0;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row items-center gap-6 p-4 rounded-[2rem] border-2 border-[#b08d57]/10 bg-[#fdfbf7]/30 hover:bg-white hover:border-[#8c6d45]/20 hover:shadow-xl hover:shadow-[#8c6d45]/5 transition-all duration-500"
                >
                  <div className="relative h-24 w-24 sm:h-20 sm:w-20 overflow-hidden rounded-2xl shadow-sm border-2 border-white group-hover:scale-105 transition-transform">
                    <img
                      src={productImage}
                      className="h-full w-full object-cover"
                      alt={productName}
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h4 className="font-serif text-lg text-[#2a2421] leading-tight mb-1">{productName}</h4>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">
                        R$ {productPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-[#b08d57]/30" />
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    {item.guestName && (
                      <div className="mt-3 p-3 rounded-xl bg-white/50 border border-[#b08d57]/10 flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2a2421] flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-green-600" />
                          Reservado por: {item.guestName}
                        </span>
                        {item.guestMessage && (
                          <p className="text-[10px] italic text-[#8c6d45] leading-relaxed">
                            "{item.guestMessage}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {item.status === "reservado" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleCancelReservation(item.id);
                      }}
                      disabled={processingItemId === item.id}
                      className="flex items-center gap-2 rounded-full border border-[#b08d57]/18 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#8c6d45] shadow-sm transition-all hover:border-[#8c6d45]/35 hover:bg-[#f7f2ed] disabled:cursor-wait disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {processingItemId === item.id ? "Cancelando..." : "Cancelar Reserva"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
