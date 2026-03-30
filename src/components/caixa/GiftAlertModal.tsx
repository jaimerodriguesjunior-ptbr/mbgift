"use client";

import { useMemo, useState } from "react";
import { Check, Gift, ShoppingBag, X } from "lucide-react";

export interface GiftReservationCandidate {
  giftListItemId: string;
  guestName: string;
  listName: string;
  status: "disponivel" | "reservado";
}

interface GiftAlertModalProps {
  productName: string;
  matches: GiftReservationCandidate[];
  onConfirm: (match: GiftReservationCandidate | null) => void;
  onClose: () => void;
}

export function GiftAlertModal({ productName, matches, onConfirm, onClose }: GiftAlertModalProps) {
  const [selectedGiftListItemId, setSelectedGiftListItemId] = useState(matches[0]?.giftListItemId ?? "");

  const selectedMatch = useMemo(
    () => matches.find((match) => match.giftListItemId === selectedGiftListItemId) ?? matches[0] ?? null,
    [matches, selectedGiftListItemId]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2a2421]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[2rem] border-2 border-[#b08d57]/20 bg-white p-8 shadow-2xl shadow-[#b08d57]/20 animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-[#a69b8f] transition-colors hover:bg-[#f7f2ed]">
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-2 border-amber-200 bg-amber-50">
            <Gift className="h-8 w-8 text-amber-600" />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-600">Alerta de Lista de Presentes</p>
            <h2 className="font-serif text-2xl text-[#2a2421]">{productName}</h2>
            <p className="mt-2 text-sm font-medium text-[#5c4a33]">
              Este produto aparece em lista de presentes. Escolha abaixo em qual evento a compra deve ser registrada.
            </p>
            <p className="mt-1 text-xs text-[#a69b8f]">Se não for presente, siga como venda direta.</p>
          </div>

          <div className="mt-2 flex w-full flex-col gap-3">
            <div className="w-full rounded-2xl border-2 border-[#b08d57]/18 bg-[#fcfaf7] p-4 text-left">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#8c6d45]">
                Lista relacionada
              </label>
              <select
                value={selectedGiftListItemId}
                onChange={(event) => setSelectedGiftListItemId(event.target.value)}
                className="w-full rounded-2xl border border-[#b08d57]/25 bg-white px-4 py-3 text-sm font-semibold text-[#2a2421] outline-none transition-all focus:border-[#8c6d45]"
              >
                {matches.map((match) => (
                  <option key={match.giftListItemId} value={match.giftListItemId}>
                    {match.listName}
                    {match.status === "reservado" && match.guestName ? ` - reservado para ${match.guestName}` : " - disponível"}
                  </option>
                ))}
              </select>

              {selectedMatch ? (
                <div className="mt-3 rounded-2xl border border-[#b08d57]/15 bg-white/85 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6d45]">Situação atual</p>
                  <p className="mt-1 text-sm font-semibold text-[#2a2421]">
                    {selectedMatch.status === "reservado"
                      ? `Reservado para ${selectedMatch.guestName || "convidado não identificado"}`
                      : "Disponível na lista"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={() => onConfirm(null)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-[#b08d57]/25 bg-white py-3 text-xs font-black uppercase tracking-widest text-[#5c4a33] transition-all hover:bg-[#f7f2ed]"
              >
                <ShoppingBag className="h-4 w-4" />
                Venda direta
              </button>

              <button
                onClick={() => selectedMatch && onConfirm(selectedMatch)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#8c6d45] py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#725a38] shadow-lg shadow-[#8c6d45]/20"
              >
                <Check className="h-4 w-4" />
                Registrar na lista
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
