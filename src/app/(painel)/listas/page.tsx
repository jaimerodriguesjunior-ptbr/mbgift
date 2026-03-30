"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { GiftListMaster } from "@/components/listas/GiftListMaster";
import { GiftListDetail } from "@/components/listas/GiftListDetail";
import type { GiftListRecord } from "@/lib/gift-lists/types";
import { fetchCurrentTenantSettings, fetchGiftLists } from "@/lib/painel-api";

export default function ListasPage() {
  const router = useRouter();
  const [lists, setLists] = useState<GiftListRecord[]>([]);
  const [selectedList, setSelectedList] = useState<GiftListRecord | null>(null);
  const [storeLabel, setStoreLabel] = useState("MBGifts");

  const handleCreateList = () => {
    router.push("/listas/novo");
  };

  const handleUpdateList = (updated: GiftListRecord) => {
    setLists((prev) => prev.map((list) => (list.id === updated.id ? updated : list)));
    setSelectedList(updated);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadLists() {
      try {
        const [data, tenant] = await Promise.all([
          fetchGiftLists(),
          fetchCurrentTenantSettings().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
        setLists(data);
        setSelectedList((current) =>
          current ? data.find((entry) => entry.id === current.id) ?? data[0] ?? null : data[0] ?? null
        );
      } catch (error) {
        if (isMounted) {
          window.alert(error instanceof Error ? error.message : "Falha ao carregar listas.");
        }
      }
    }

    void loadLists();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fefcfb]">
      <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white px-8 z-30 shadow-sm relative">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 text-[#2a2421] hover:text-[#8c6d45] transition-all group"
        >
          <div className="rounded-full bg-[#b08d57]/10 p-2.5 group-hover:bg-[#b08d57]/20 group-hover:scale-110 transition-all border-2 border-[#b08d57]/20">
            <ArrowLeft className="h-4 w-4 stroke-[3px]" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Voltar</span>
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="font-serif text-3xl text-[#2a2421] tracking-[0.25em] uppercase">{storeLabel}</h1>
          <div className="h-[2px] w-12 bg-[#8c6d45] my-1" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Listas de Presentes</p>
        </div>

        <button
          onClick={handleCreateList}
          className="flex items-center gap-2 rounded-full border-2 border-[#b08d57]/20 bg-white px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Nova Lista</span>
          <span className="md:hidden">Novo</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`w-full md:w-80 lg:w-96 flex-shrink-0 shadow-[10px_0_30px_rgba(176,141,87,0.03)] z-20 overflow-hidden border-r border-[#b08d57]/10 transition-all duration-300 ${
          selectedList ? "hidden md:block" : "block"
        }`}>
          <GiftListMaster
            lists={lists}
            selectedListId={selectedList?.id}
            onSelectList={setSelectedList}
          />
        </aside>

        <main className={`flex-1 overflow-hidden relative z-10 bg-[#fefcfb] transition-all duration-300 ${
          selectedList ? "block" : "hidden md:block"
        }`}>
          {selectedList ? (
            <div className="h-full flex flex-col">
              <button
                onClick={() => setSelectedList(null)}
                className="md:hidden flex items-center gap-2 p-4 bg-white border-b border-[#b08d57]/10 text-[#8c6d45] font-bold uppercase tracking-wider text-[10px]"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Listas
              </button>
              <div className="flex-1 overflow-hidden">
                <GiftListDetail
                  list={selectedList}
                  onUpdate={handleUpdateList}
                />
              </div>
            </div>
          ) : (
            <div className="hidden md:flex h-full items-center justify-center p-12 text-center opacity-30">
              <div className="max-w-xs">
                <div className="h-24 w-24 rounded-[2.5rem] bg-[#b08d57]/10 flex items-center justify-center mx-auto mb-6 text-[#8c6d45]">
                  <Plus className="h-10 w-10 stroke-1" />
                </div>
                <h3 className="font-serif text-2xl text-[#2a2421]">Gestão de Listas</h3>
                <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-[#8c6d45]">
                  Selecione uma lista ao lado para gerenciar itens, prazos e visibilidade.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
