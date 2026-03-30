"use client";

import { useState } from 'react';
import { Product } from '@/types';
import { Search, Plus, Minus, Tag, Printer, X, Trash2 } from 'lucide-react';
import { QRCodeSVG } from "qrcode.react";
import LabelSheet from './LabelSheet';

interface LabelCenterProps {
  products: Product[];
  onClose: () => void;
  storeLabel: string;
}

export default function LabelCenter({ products, onClose, storeLabel }: LabelCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [showSheet, setShowSheet] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.ean.includes(searchTerm)
  );

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const selectedEntries = Object.entries(selectedQuantities)
    .map(([id, qty]) => ({
      product: products.find(p => p.id === id)!,
      quantity: qty
    }))
    .filter(entry => entry.product);

  const totalLabels = selectedEntries.reduce((acc, curr) => acc + curr.quantity, 0);

  if (showSheet) {
    return <LabelSheet items={selectedEntries} onClose={() => setShowSheet(false)} storeLabel={storeLabel} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f8f5f2] flex flex-col md:flex-row animate-in fade-in duration-500">
      {/* Sidebar: Product Selection */}
      <div className="w-full md:w-[450px] bg-white border-r border-[#b08d57]/20 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-[#b08d57]/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-[#2a2421]">Gerador de Etiquetas</h2>
            <button onClick={onClose} className="p-2 hover:bg-[#faf8f5] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#5c4a33]" />
            </button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c6d45] group-focus-within:text-[#b08d57] transition-colors" />
            <input 
              type="text"
              placeholder="Buscar produto ou EAN..."
              className="w-full rounded-2xl border-2 border-[#b08d57]/10 bg-[#faf8f5] py-3.5 pl-12 pr-4 text-sm focus:border-[#b08d57]/40 focus:bg-white outline-none transition-all placeholder:text-[#b08d57]/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
          {filteredProducts.map(product => {
            const qty = selectedQuantities[product.id] || 0;
            return (
              <div 
                key={product.id}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                  qty > 0 ? "border-[#8c6d45] bg-[#faf8f5] shadow-sm" : "border-transparent hover:border-[#b08d57]/20"
                }`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#2a2421] truncate">{product.name}</p>
                  <p className="text-[10px] text-[#8c6d45] font-bold uppercase tracking-widest mt-0.5">
                    Ref: {product.ean || 'Interna'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {qty > 0 && (
                    <>
                      <button 
                        onClick={() => handleUpdateQuantity(product.id, -1)}
                        className="h-8 w-8 rounded-full border border-[#b08d57]/30 flex items-center justify-center text-[#5c4a33] hover:bg-white transition-colors shadow-sm"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-black text-[#8c6d45] w-6 text-center">{qty}</span>
                    </>
                  )}
                  <button 
                    onClick={() => handleUpdateQuantity(product.id, 1)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                      qty > 0 ? "bg-[#8c6d45] text-white hover:bg-[#725a38]" : "bg-white border border-[#b08d57]/30 text-[#5c4a33] hover:border-[#8c6d45]"
                    }`}
                  >
                    <Plus className="h-4 w-4 text-inherit" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area: Selection Summary & Actions */}
      <div className="flex-1 p-8 md:p-12 overflow-auto flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {selectedEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <div className="h-20 w-20 rounded-full bg-[#b08d57]/10 flex items-center justify-center mb-6">
                <Tag className="h-10 w-10 text-[#8c6d45]" />
              </div>
              <h3 className="font-serif text-2xl text-[#2a2421] mb-2">Nenhuma etiqueta pendente</h3>
              <p className="text-sm text-[#5c4a33]">Selecione os produtos ao lado para começar a montar sua folha de impressão.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#b08d57]/20">
                <h3 className="font-serif text-3xl text-[#2a2421]">Carrinho de Etiquetas</h3>
                <button 
                  onClick={() => setSelectedQuantities({})}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar Tudo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start mb-8">
                {selectedEntries.map(({ product, quantity }) => (
                  <div key={product.id} className="bg-white p-6 rounded-3xl border border-[#b08d57]/10 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#b08d57]/10 bg-[#faf8f5]">
                      {product.images[0] ? (
                        <img src={product.images[0]} className="h-16 w-16 object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Tag className="h-5 w-5 text-[#b08d57]/60" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-serif text-lg text-[#2a2421] leading-tight truncate">{product.name}</p>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-[#b08d57]/10 bg-[#fcfbf9] px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#b08d57]/10 bg-white">
                            <QRCodeSVG
                              value={product.ean || product.id}
                              size={36}
                              level="M"
                              includeMargin={false}
                              bgColor="#FFFFFF"
                              fgColor="#1f1a17"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">QR da etiqueta</p>
                            <p className="mt-1 truncate font-mono text-[10px] font-bold text-[#b08d57]/60">{product.ean || "INTERNO"}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c6d45]">{quantity} unidades</span>
                          <span className="h-1 w-1 rounded-full bg-[#b08d57]/40" />
                          <span className="truncate font-mono text-[10px] font-bold text-[#b08d57]/60">EAN: {product.ean || "INTERNO"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Action Bar */}
              <div className="bg-[#8c6d45] rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between shadow-2xl shadow-[#8c6d45]/30 animate-in slide-in-from-bottom-8 duration-700">
                <div>
                  <p className="text-white/70 text-[10px] uppercase font-bold tracking-[0.3em]">Resumo da Folha</p>
                  <h4 className="text-white font-serif text-4xl mt-1">{totalLabels} <span className="text-xl opacity-60">etiquetas</span></h4>
                </div>
                <button 
                  onClick={() => setShowSheet(true)}
                  className="mt-6 sm:mt-0 w-full sm:w-auto px-12 py-5 bg-white rounded-2xl text-[#8c6d45] font-black uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-4"
                >
                  <Printer className="h-5 w-5" />
                  Gerar Impressão
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
