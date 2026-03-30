"use client";

import { Search, User } from "lucide-react";
import { useState } from "react";
import { Client } from "@/types";

interface CustomerListProps {
  clients: Client[];
  selectedClientId?: string;
  onSelectClient: (client: Client) => void;
}

export function CustomerList({ clients, selectedClientId, onSelectClient }: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instagram.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Search Header */}
      <div className="p-6 border-b border-[#b08d57]/10 bg-white/40 backdrop-blur-md">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a69b8f] group-focus-within:text-[#b08d57] transition-colors" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="w-full rounded-2xl border-2 border-[#b08d57]/30 bg-[#fdfbf7]/60 backdrop-blur-sm py-3 pl-11 pr-4 text-sm font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-4 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left group border-2 ${
                selectedClientId === client.id
                  ? "bg-[#8c6d45]/90 border-[#8c6d45] text-white shadow-xl shadow-[#8c6d45]/20 scale-[1.02]"
                  : "bg-white/70 backdrop-blur-sm border-[#b08d57]/15 hover:border-[#b08d57]/40 hover:bg-[#fdfbf7]/80 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border-2 border-[#f7f2ed] shadow-sm">
                <img
                  src={client.photo || `https://unavatar.io/instagram/${client.instagram}`}
                  alt={client.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=f7f2ed&color=8c6d45`;
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif text-lg leading-tight truncate ${
                  selectedClientId === client.id ? "text-white" : "text-[#2a2421]"
                }`}>
                  {client.name}
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest truncate mt-0.5 ${
                  selectedClientId === client.id ? "text-white/70" : "text-[#5c4a33]"
                }`}>
                  {client.email || `@${client.instagram}`}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <User className="h-12 w-12 mb-2" />
            <p className="text-sm font-medium uppercase tracking-widest">Nenhum cliente</p>
          </div>
        )}
      </div>
    </div>
  );
}
