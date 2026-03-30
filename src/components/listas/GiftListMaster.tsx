"use client";

import { Search, Calendar, ChevronRight, Gift } from "lucide-react";
import { useState } from "react";
import type { GiftListRecord } from "@/lib/gift-lists/types";

interface GiftListMasterProps {
  lists: GiftListRecord[];
  selectedListId?: string;
  onSelectList: (list: GiftListRecord) => void;
}

export function GiftListMaster({ lists, selectedListId, onSelectList }: GiftListMasterProps) {
  const [search, setSearch] = useState("");

  const filteredLists = lists.filter((list) =>
    list.brideName.toLowerCase().includes(search.toLowerCase()) ||
    list.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="p-6 border-b border-[#b08d57]/10">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c6d45] group-focus-within:text-[#2a2421] transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Buscar lista ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border-2 border-[#b08d57]/10 bg-[#fdfbf7] py-3.5 pl-12 pr-4 text-sm font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-8 focus:ring-[#8c6d45]/5 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {filteredLists.map((list) => (
          <button
            key={list.id}
            onClick={() => onSelectList(list)}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-500 text-left group border-2 ${
              selectedListId === list.id
                ? "bg-[#8c6d45] border-[#8c6d45] text-white shadow-xl shadow-[#8c6d45]/20 scale-[1.02] z-10"
                : "bg-white border-[#b08d57]/15 hover:border-[#b08d57]/40 hover:bg-[#fdfbf7] shadow-sm hover:shadow-md text-[#2a2421]"
            }`}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-md group-hover:rotate-3 transition-transform duration-500">
              <img
                src={list.photo}
                alt={list.brideName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className={`font-serif text-lg truncate ${selectedListId === list.id ? "text-white" : "text-[#2a2421]"}`}>
                  {list.brideName}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${selectedListId === list.id ? "text-white/80" : "text-[#5c4a33]"}`}>
                  <Calendar className="h-3 w-3" />
                  {list.eventDate ? new Date(list.eventDate).toLocaleDateString("pt-BR") : "Data em aberto"}
                </div>
                <div className={`h-1 w-1 rounded-full ${selectedListId === list.id ? "bg-white/30" : "bg-[#b08d57]/40"}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedListId === list.id ? "text-white/60" : "text-[#8c6d45]"}`}>
                  {list.items.length} itens
                </span>
              </div>
            </div>

            <ChevronRight className={`h-5 w-5 transition-transform duration-500 group-hover:translate-x-1 ${
              selectedListId === list.id ? "text-white/40" : "text-[#b08d57]/50"
            }`} />
          </button>
        ))}

        {filteredLists.length === 0 && (
          <div className="p-12 text-center opacity-40">
            <Gift className="h-12 w-12 mx-auto mb-4 text-[#8c6d45]" />
            <p className="font-medium text-[#8c6d45] uppercase tracking-widest text-xs leading-relaxed">
              Nenhuma lista encontrada para sua busca.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
