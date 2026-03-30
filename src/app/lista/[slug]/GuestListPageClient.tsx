"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Heart, Gift, Calendar, MapPin, Check, X, ArrowLeft, ChevronDown } from "lucide-react";

import { ListaItem } from "@/components/listas/ListaItem";
import { fetchPublicGiftList, reservePublicGift } from "@/lib/painel-api";
import type { GiftListItemRecord, GiftListRecord } from "@/lib/gift-lists/types";
import type { TenantStoreIdentity } from "@/lib/tenants/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function GuestListPageClient({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const [list, setList] = useState<GiftListRecord | null>(null);
  const [tenant, setTenant] = useState<TenantStoreIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ item: GiftListItemRecord } | null>(null);
  const [guestInfo, setGuestInfo] = useState({ name: "", message: "" });
  const [isSuccess, setIsSuccess] = useState(false);
  const isHostPreview = searchParams.get("preview") === "host";
  const returnToken = searchParams.get("returnToken");

  useEffect(() => {
    let isMounted = true;

    async function loadList() {
      try {
        const tenantSlug = searchParams.get("tenant") ?? undefined;
        const payload = await fetchPublicGiftList(params.slug, tenantSlug);

        if (!isMounted) {
          return;
        }

        setList(payload.giftList);
        setTenant(payload.tenant);
      } catch {
        if (isMounted) {
          setList(null);
          setTenant(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadList();

    return () => {
      isMounted = false;
    };
  }, [params.slug, searchParams]);

  const itemsWithProducts = useMemo(
    () =>
      (list?.items.filter((item) => item.product) ?? []) as Array<
        GiftListItemRecord & { product: NonNullable<GiftListItemRecord["product"]> }
      >,
    [list]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-12 text-center bg-[#fefcfb]">
        <div className="space-y-4">
          <Gift className="h-16 w-16 mx-auto text-[#b08d57] opacity-20" />
          <h2 className="font-serif text-3xl text-[#2a2421]">Carregando evento</h2>
          <p className="text-sm text-[#8c6d45] uppercase tracking-widest">Aguarde um instante.</p>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex h-screen items-center justify-center p-12 text-center bg-[#fefcfb]">
        <div className="space-y-4">
          <Gift className="h-16 w-16 mx-auto text-[#b08d57] opacity-20" />
          <h2 className="font-serif text-3xl text-[#2a2421]">Lista nÃ£o encontrada</h2>
          <p className="text-sm text-[#8c6d45] uppercase tracking-widest">Verifique o link ou entre em contato com os anfitriÃµes.</p>
        </div>
      </div>
    );
  }

  async function handleConfirmGift() {
    if (!guestInfo.name) {
      window.alert("Por favor, informe seu nome.");
      return;
    }

    if (!selectedItem) {
      return;
    }

    try {
      const payload = await reservePublicGift(params.slug, {
        itemId: selectedItem.item.id,
        guestName: guestInfo.name,
        guestMessage: guestInfo.message,
        tenantSlug: tenant?.slug
      });

      setList(payload.giftList);
      setTenant(payload.tenant);
      setIsSuccess(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao reservar presente.");
    }
  }

  function closeOverlay() {
    setSelectedItem(null);
    setIsSuccess(false);
    setGuestInfo({ name: "", message: "" });
  }

  async function handleShare() {
    if (!list) {
      return;
    }

    const shareUrl = window.location.href;
    const shareData = {
      title: `${tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts"} | Lista de Presentes`,
      text: `Confira a lista de presentes de ${list.brideName}.`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert("Link copiado para compartilhar a lista.");
    } catch {
      window.prompt("Copie o link da lista:", shareUrl);
    }
  }

  const storeLabel = tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts";

  return (
    <div className="min-h-screen bg-[#fdfbf7] selection:bg-[#b08d57]/20 relative pb-40">
      <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white/95 px-4 shadow-sm backdrop-blur-md md:px-8">
        <div className="flex w-24 md:w-32">
          {isHostPreview ? (
            returnToken ? (
              <Link
                href={`/lista/${params.slug}/editar?token=${encodeURIComponent(returnToken)}`}
                className="flex items-center gap-2 text-[#8c6d45] hover:text-[#5c4a33] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">
                  Voltar
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-[#8c6d45] hover:text-[#5c4a33] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">
                  Voltar
                </span>
              </button>
            )
          ) : null}
        </div>

        <div className="flex flex-col items-center text-center">
          <h1 className="font-serif text-2xl md:text-3xl text-[#2a2421] tracking-[0.2em] uppercase leading-none">
            {storeLabel}
          </h1>
          <p className="mt-2 text-[8px] md:text-[9px] uppercase tracking-[0.5em] text-[#8c6d45] font-black">
            Lista do Convidado
          </p>
        </div>

        <div className="w-24 md:w-32" />
      </header>

      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={list.photo}
            className="w-full h-full object-cover grayscale-[30%] opacity-40 scale-110 blur-sm"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#fdfbf7]/40 via-transparent to-[#fdfbf7]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl animate-in fade-in zoom-in px-6 text-center duration-1000">
          <div className="rounded-[2rem] border border-white/55 bg-[#fdfbf7]/72 px-6 py-8 shadow-[0_28px_80px_rgba(92,74,51,0.12)] backdrop-blur-md md:px-12 md:py-12">
            <div className="space-y-10">
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-4 text-[#8c6d45]">
                  <div className="h-[1px] w-8 bg-[#b08d57]/35" />
                  <span className="text-[10px] font-black uppercase tracking-[0.45em]">Celebrando este momento</span>
                  <div className="h-[1px] w-8 bg-[#b08d57]/35" />
                </div>
                <h1 className="font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-[#201b19] drop-shadow-[0_8px_20px_rgba(253,251,247,0.35)] whitespace-pre-line md:text-8xl">
                  {list.brideName.replace(" & ", " \n & ")}
                </h1>
              </div>

              <div className="relative mx-auto max-w-3xl border-y border-[#b08d57]/15 py-8 md:py-10">
                <Heart className="absolute -top-4 left-1/2 h-8 w-8 -translate-x-1/2 fill-current text-[#b08d57]/25" />
                <p className="font-serif text-2xl italic leading-relaxed text-[#4f4031] md:text-3xl">
                  "{list.headline}"
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-10 text-[#241f1c] md:flex-row md:gap-12">
                <div className="flex flex-col items-center gap-2">
                  <span className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-[#8c6d45]/70">Data do Evento</span>
                  <div className="flex items-center gap-3 font-serif text-2xl uppercase tracking-tighter md:text-3xl">
                    <Calendar className="h-5 w-5 text-[#b08d57]" />
                    {formatDate(list.eventDate)}
                  </div>
                </div>
                <div className="hidden h-12 w-[1px] bg-[#b08d57]/20 md:block" />
                <div className="flex flex-col items-center gap-2">
                  <span className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-[#8c6d45]/70">Cidade / Local</span>
                  <div className="flex items-center gap-3 font-serif text-2xl uppercase tracking-tighter md:text-3xl">
                    <MapPin className="h-5 w-5 text-[#b08d57]" />
                    {list.city}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-center md:hidden">
            <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-4 py-2 text-[#8c6d45] shadow-[0_14px_30px_rgba(92,74,51,0.1)] backdrop-blur-md">
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Veja os presentes</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-12 px-6 pt-14 md:space-y-20 md:pt-24">
        <div className="flex flex-col gap-6 border-b border-[#b08d57]/10 pb-8 md:flex-row md:items-end md:justify-between md:gap-8 md:pb-12">
          <div className="space-y-2">
            <h2 className="font-serif text-4xl md:text-6xl text-[#2a2421]">SugestÃµes de Presentes</h2>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#8c6d45] font-black">
              Escolha um presente especial
            </p>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3 lg:gap-y-20">
          {itemsWithProducts.map((item) => (
            <ListaItem
              key={item.id}
              product={item.product}
              status={item.status}
              publicView
              onChoose={() => setSelectedItem({ item })}
            />
          ))}
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2a2421]/70 backdrop-blur-md animate-in fade-in duration-500">
          <div className="flex min-h-full items-start justify-center p-4 md:items-center md:p-6">
            <div className="relative my-4 w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-12 duration-700 md:my-0 md:rounded-[4rem] md:p-16">
              <button onClick={closeOverlay} className="absolute right-6 top-6 text-[#a69b8f] transition-colors hover:text-[#2a2421] md:right-10 md:top-10">
                <X className="h-6 w-6 md:h-8 md:w-8" />
              </button>

              {!isSuccess ? (
                <div className="grid items-start gap-6 md:grid-cols-2 md:gap-12">
                  <div className="space-y-6">
                    <div className="relative aspect-[4/4.5] overflow-hidden rounded-[2rem] border border-[#b08d57]/10 bg-[#f7f2ed] shadow-lg md:aspect-[4/5] md:rounded-[2.5rem]">
                      <img src={selectedItem.item.product?.images[selectedItem.item.product.mainImageIndex]} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#201b19]/88 via-[#201b19]/45 to-transparent px-5 pb-5 pt-16 md:px-6 md:pb-6">
                        <div className="rounded-[1.5rem] border border-white/20 bg-[#201b19]/45 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md">
                          <h4 className="font-serif text-[1.9rem] leading-[1.05] tracking-[-0.04em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] md:text-[2.1rem]">{selectedItem.item.product?.name}</h4>
                          <p className="mt-2 text-lg font-semibold text-white/90">
                            {formatCurrency(selectedItem.item.product?.price ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 md:space-y-6">
                    <div className="space-y-3">
                      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">Seu Nome</label>
                      <input
                        className="w-full rounded-2xl border-2 border-[#d9c7ae] bg-white p-4 text-sm font-medium text-[#2a2421] shadow-[0_8px_24px_rgba(92,74,51,0.06)] outline-none transition-all placeholder:text-[#9aa3b2] focus:border-[#8c6d45] md:p-5"
                        placeholder="Ex: FamÃ­lia Sampaio"
                        value={guestInfo.name}
                        onChange={(event) => setGuestInfo({ ...guestInfo, name: event.target.value })}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">Mensagem para o Casal</label>
                      <textarea
                        className="w-full rounded-2xl border-2 border-[#d9c7ae] bg-white p-4 text-sm font-medium text-[#2a2421] shadow-[0_8px_24px_rgba(92,74,51,0.06)] outline-none transition-all placeholder:text-[#9aa3b2] focus:border-[#8c6d45] md:p-5"
                        placeholder="Escreva seus votos..."
                        rows={3}
                        value={guestInfo.message}
                        onChange={(event) => setGuestInfo({ ...guestInfo, message: event.target.value })}
                      />
                    </div>

                    <button
                      onClick={() => {
                        void handleConfirmGift();
                      }}
                      className="flex w-full items-center justify-center gap-3 rounded-[1.4rem] bg-[#2a2421] py-5 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-black/10 transition-all hover:bg-black md:rounded-[2rem] md:py-6"
                    >
                      Confirmar Reserva
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 py-6 text-center animate-in zoom-in duration-500 md:space-y-10 md:py-10">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#8c6d45]/10 text-[#8c6d45] shadow-xl shadow-[#8c6d45]/10">
                    <Heart className="h-12 w-12 fill-[#8c6d45] stroke-[2.5px]" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-serif text-4xl text-[#2a2421] md:text-5xl">Reserva Confirmada!</h3>
                    <p className="mx-auto max-w-sm px-4 font-serif text-xl italic leading-relaxed text-[#6f5430]">
                      Seu presente ficou reservado. Visite a {storeLabel} para concluir a compra, ou, se precisar, cancelar a reserva.
                    </p>
                  </div>
                  <div className="pt-6 md:pt-8">
                    <button
                      onClick={closeOverlay}
                      className="rounded-full bg-[#2a2421] px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black md:px-12 md:py-5"
                    >
                      Voltar para a Lista
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute -bottom-10 left-1/2 hidden h-1 w-48 -translate-x-1/2 rounded-full bg-[#b08d57]/20 md:block" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
