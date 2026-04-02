import { Barcode, Search, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Product } from "@/types";
import { ScannerModal } from "./ScannerModal";

interface ProductListProps {
  products: Product[];
  selectedProductId?: string;
  onSelectProduct: (product: Product) => void;
  onEanNotFound?: (ean: string) => void;
  stockMeta?: Record<string, { available: number; reserved: number }>;
}

export function ProductList({ products, selectedProductId, onSelectProduct, onEanNotFound, stockMeta = {} }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 8) {
      const matched = products.find((product) => product.ean === searchTerm);
      if (matched) {
        onSelectProduct(matched);
        setSearchTerm("");
      } else if (/^\d{12,13}$/.test(searchTerm)) {
        if (onEanNotFound) {
          onEanNotFound(searchTerm);
          setSearchTerm("");
        }
      }
    }
  }, [searchTerm, products, onSelectProduct, onEanNotFound]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.ean && product.ean.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex h-full flex-col bg-white/40 backdrop-blur-md border-r border-[#b08d57]/10">
      <div className="p-6 border-b border-[#b08d57]/10">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[#a69b8f] group-focus-within:text-[#b08d57] transition-colors">
              <Barcode className="h-4 w-4" />
              <Search className="h-4 w-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Bipar código ou buscar"
              className="w-full rounded-2xl border-2 border-[#b08d57]/30 bg-white py-3.5 pl-[4.35rem] pr-4 text-sm font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-4 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex h-[3.25rem] w-[3.25rem] md:hidden flex-shrink-0 items-center justify-center rounded-2xl bg-[#8c6d45] text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] transition-all active:scale-95"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45] md:hidden">
          Use a câmera para ler etiquetas e códigos
        </p>
      </div>

      {isScannerOpen && (
        <ScannerModal
          onClose={() => setIsScannerOpen(false)}
          onCodeScanned={(code) => {
            setSearchTerm(code);
            setIsScannerOpen(false);
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 custom-scrollbar">
        {filteredProducts.map((product) => {
          const isSelected = product.id === selectedProductId;
          const meta = stockMeta[product.id] ?? { available: product.stock, reserved: 0 };
          const previewImage = product.images[product.mainImageIndex] ?? product.images[0] ?? null;
          return (
            <button
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className={`group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-all duration-300 border-2 ${
                isSelected
                  ? "bg-[#b08d57] border-[#b08d57] shadow-xl shadow-[#b08d57]/20 scale-[1.02]"
                  : "bg-white border-[#b08d57]/15 hover:border-[#b08d57]/40 hover:bg-[#fdfbf7] shadow-sm hover:shadow-md"
              }`}
            >
              <div className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 shadow-sm transition-transform duration-500 group-hover:scale-105 ${isSelected ? "border-white/30 ring-2 ring-white/20" : "border-[#f7f2ed]"}`}>
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center ${isSelected ? "bg-white/20 text-white" : "bg-[#f8f3ee] text-[#b08d57]"}`}>
                    <Search className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`truncate font-serif text-lg transition-colors ${isSelected ? "text-white font-medium" : "text-[#2a2421]"}`}>
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {product.isDraft ? (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${isSelected ? "bg-white text-[#8c6d45]" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                      Bip-Novo
                    </span>
                  ) : (
                    <>
                      <span className={`text-[10px] uppercase tracking-widest font-extrabold ${isSelected ? "text-white/90" : "text-[#5c4a33]"}`}>
                        Disp.: {meta.available}
                      </span>
                      {meta.reserved > 0 ? (
                        <>
                          <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-white/40" : "bg-[#b08d57]/40"}`} />
                          <span className={`text-[9px] uppercase tracking-widest font-extrabold ${isSelected ? "text-white/80" : "text-amber-700"}`}>
                            Condic.: {meta.reserved}
                          </span>
                        </>
                      ) : null}
                    </>
                  )}
                  <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-white/40" : "bg-[#b08d57]/40"}`} />
                  <span className={`text-[10px] uppercase tracking-widest font-extrabold ${isSelected ? "text-white/90" : "text-[#8c6d45]"}`}>
                    {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-40">
            <Search className="h-10 w-10 mb-4 text-[#a69b8f]" />
            <p className="text-sm font-medium text-[#5c4a33]">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
