"use client";

import { Camera, Plus, Minus, Trash2, Barcode as BarcodeIcon, Package, Tag, Coins, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect, ReactElement } from "react";
import { Product } from "@/types";

interface ProductDetailProps {
  product: Product | null;
  onUpdate: (updatedProduct: Product) => void;
  onSave?: (product: Product) => void;
  onDiscard?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onImagesSelected?: (entries: Array<{ file: File; previewUrl: string }>) => void;
  canDelete?: boolean;
  categories?: string[];
  reservedStock?: number;
  availableStock?: number;
}

export function ProductDetail({
  product,
  onUpdate,
  onSave,
  onDiscard,
  onDelete,
  onImagesSelected,
  canDelete = false,
  categories = [],
  reservedStock = 0
}: ProductDetailProps) {
  const [formData, setFormData] = useState<Product | null>(product);
  const [baselineStock, setBaselineStock] = useState(product?.stock ?? 0);
  const [priceInputValue, setPriceInputValue] = useState(formatPriceInput(product?.price ?? 0));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(product);
    setPriceInputValue(formatPriceInput(product?.price ?? 0));
  }, [product]);

  useEffect(() => {
    if (product) {
      setBaselineStock(product.stock);
    }
  }, [product?.id]);

  if (!product || !formData) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-12 opacity-50">
        <div className="mb-6 rounded-full bg-[#b08d57]/5 p-8 border border-[#b08d57]/10">
          <Package className="h-16 w-16 text-[#b08d57]" strokeWidth={1} />
        </div>
        <h2 className="font-serif text-3xl text-[#5c4a33]">Selecione um produto</h2>
        <p className="mt-2 text-[#a69b8f] max-w-sm">
          Escolha um item da lista ao lado para visualizar e editar os detalhes completos.
        </p>
      </div>
    );
  }

  const productTitle = formData.name.trim() || "Novo produto";
  const isCosmosDraft = formData.isDraft && formData.draftOrigin === "cosmos";
  const handleStockChange = (amount: number) => {
    const newStock = Math.max(reservedStock, formData.stock + amount);
    const updated = { ...formData, stock: newStock };
    setFormData(updated);
    onUpdate(updated);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const numericValue = name === "stock" ? Number(value) : value;
    const updated = {
      ...formData,
      [name]: name === "stock" ? Math.max(reservedStock, Number(numericValue)) : numericValue
    };
    setFormData(updated);
    onUpdate(updated);
  };

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = normalizePriceInput(event.target.value);
    setPriceInputValue(sanitized);

    const updated = {
      ...formData,
      price: parsePriceInput(sanitized)
    };
    setFormData(updated);
    onUpdate(updated);
  };

  const handlePriceBlur = () => {
    setPriceInputValue(formatPriceInput(formData.price));
  };

  const handleAddPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const entries = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      const newUrls = entries.map((entry) => entry.previewUrl);
      const updated = { ...formData, images: [...formData.images, ...newUrls] };
      setFormData(updated);
      onUpdate(updated);
      onImagesSelected?.(entries);
      event.target.value = "";
    }
  };

  const handleSetMain = (index: number) => {
    const updated = { ...formData, mainImageIndex: index };
    setFormData(updated);
    onUpdate(updated);
  };

  const handleDeletePhoto = (index: number) => {
    const newImages = formData.images.filter((_, imageIndex) => imageIndex !== index);
    let newMainIndex = formData.mainImageIndex;
    if (index === formData.mainImageIndex) newMainIndex = 0;
    else if (index < formData.mainImageIndex) newMainIndex--;

    const updated = {
      ...formData,
      images: newImages,
      mainImageIndex: Math.max(0, newMainIndex)
    };
    setFormData(updated);
    onUpdate(updated);
  };

  const quantityToneClass = formData.stock > baselineStock
    ? "text-blue-600"
    : formData.stock < baselineStock
      ? "text-red-600"
      : "text-[#2a2421]";

  const handleSave = () => {
    setBaselineStock(formData.stock);
    onSave?.({ ...formData, isDraft: false });
  };

  return (
    <div className="relative flex h-full flex-col overflow-x-hidden bg-transparent custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="hidden md:flex h-20 items-center justify-between border-b border-[#b08d57]/15 bg-white/55 px-8 backdrop-blur-md">
        <div className="min-w-0">
          <h2 className={`truncate font-serif text-2xl leading-none ${formData.isDraft ? "text-amber-700" : "text-[#2a2421]"}`}>
            {productTitle}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8c6d45]">Edição de produto</p>
            {formData.isDraft ? (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-700">
                Rascunho
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canDelete ? (
            <button
              onClick={() => onDelete?.(formData)}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-700 transition hover:bg-red-100"
            >
              Excluir
            </button>
          ) : null}
          <button
            onClick={() => onDiscard?.(formData)}
            className="rounded-full border border-[#b08d57]/20 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#5c4a33] transition hover:bg-[#f7f2ed]"
          >
            Descartar
          </button>
          <button
            onClick={handleSave}
            className="rounded-full bg-[#8c6d45] px-6 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-[#725a38]"
          >
            Salvar
          </button>
        </div>
      </div>

      {formData.isDraft && isCosmosDraft && (
        <div className="mx-6 mt-3 hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <RefreshCw className="h-4 w-4 text-amber-600 animate-spin-slow" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-800">Produto identificado via Cosmos</p>
              <p className="text-[11px] text-amber-700">Revise os dados e clique em salvar para concluir.</p>
            </div>
          </div>
          <span className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[9px] font-bold text-amber-500">RASCUNHO</span>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" multiple onChange={handleAddPhoto} />

      <div className="md:hidden p-6 border-b border-[#b08d57]/10 bg-white/55 backdrop-blur-md">
        <h2 className="font-serif text-2xl text-[#2a2421] leading-tight mb-1">{productTitle}</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8c6d45]">Atualização rápida</p>
        {isCosmosDraft ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-medium text-amber-800">
            Produto novo localizado. No celular, ajuste estoque, faça as fotos e salve. O cadastro completo pode ser finalizado no computador.
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-44 md:px-6 md:py-4 md:pb-6">
        <div className="mx-auto min-h-full w-full max-w-[1180px] md:rounded-[2rem] md:border md:border-white/70 md:bg-[rgba(253,251,247,0.40)] md:p-5 md:shadow-[0_16px_40px_rgba(176,141,87,0.10)] md:backdrop-blur-md">
          <div className="flex h-full flex-col gap-6 xl:flex-row xl:gap-5">
            <div className="flex-1 space-y-6">
              <div className="hidden md:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <CompactField
                  label="Nome do Produto"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  icon={<Tag className="h-4 w-4" />}
                  placeholder="Digite o nome"
                />
                <CompactField
                  label="Categoria"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  icon={<Package className="h-4 w-4" />}
                  placeholder="Ex: Talheres"
                  listName="product-categories"
                />
                <CompactField
                  label="Código de Barras"
                  name="ean"
                  value={formData.ean}
                  onChange={handleChange}
                  icon={<BarcodeIcon className="h-4 w-4" />}
                  placeholder="Gerado automaticamente ao salvar"
                />
                <datalist id="product-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div className="grid gap-5">
                <div className="bg-white/40 md:bg-transparent p-6 md:p-0 rounded-3xl border border-[#b08d57]/10 md:border-0 shadow-sm md:shadow-none">
                  <div className="space-y-4">
                    <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
                      <PriceField
                        label="Preço de Venda"
                        name="price"
                        value={priceInputValue}
                        onChange={handlePriceChange}
                        onBlur={handlePriceBlur}
                        icon={<Coins className="h-4 w-4" />}
                        placeholder="0,00"
                      />

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#5c4a33]">Quantidade</label>
                        <div className="grid h-[52px] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 rounded-2xl border border-[#b08d57]/22 bg-white px-1.5 shadow-sm">
                          <button
                            onClick={() => handleStockChange(-1)}
                            className="flex h-10 w-10 items-center justify-center justify-self-start rounded-xl bg-[#f7f2ed] text-[#8c6d45] transition hover:bg-[#b08d57]/10"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            className={`h-full min-w-0 bg-transparent text-center text-xl font-black focus:outline-none ${quantityToneClass}`}
                            min={reservedStock}
                          />
                          <button
                            onClick={() => handleStockChange(1)}
                            className="flex h-10 w-10 items-center justify-center justify-self-end rounded-xl bg-[#8c6d45] text-white transition hover:bg-[#725a38]"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:hidden space-y-4">
                      <div className="space-y-4">
                        <label className="text-[12px] md:text-[11px] uppercase tracking-[0.25em] font-black text-[#5c4a33] block">Atualizar Quantidade</label>
                        <div className="grid h-20 grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-2xl border-2 border-[#b08d57]/30 bg-white p-1 shadow-md">
                          <button
                            onClick={() => handleStockChange(-1)}
                            className="flex h-full w-full items-center justify-center rounded-xl bg-[#f7f2ed] text-[#8c6d45] transition-all"
                          >
                            <Minus className="h-7 w-7" />
                          </button>
                          <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            className={`h-full min-w-0 bg-transparent text-center text-3xl font-black focus:outline-none ${quantityToneClass}`}
                            min={reservedStock}
                          />
                          <button
                            onClick={() => handleStockChange(1)}
                            className="flex h-full w-full items-center justify-center rounded-xl bg-[#8c6d45] text-white transition-all"
                          >
                            <Plus className="h-7 w-7" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-[#2a2421]">Fotos do Produto</h3>
                  <span className="rounded-full border border-[#b08d57]/20 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6d45]">
                    {formData.images.length} foto{formData.images.length === 1 ? "" : "s"}
                  </span>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#8c6d45]/35 bg-white px-6 py-6 text-[#8c6d45] transition hover:bg-[#b08d57]/5 hover:border-[#8c6d45]"
                >
                  <Camera className="h-8 w-8" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-[0.22em]">Tirar ou adicionar foto</p>
                    <p className="mt-1 text-sm font-medium text-[#5c4a33]">Use a camera do celular para atualizar o produto.</p>
                  </div>
                </button>

                {formData.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {formData.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => handleSetMain(index)}
                        className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${
                          formData.mainImageIndex === index ? "border-[#8c6d45] shadow-md" : "border-[#b08d57]/15"
                        }`}
                      >
                        <img src={image} className="h-full w-full object-cover" alt={`Foto ${index + 1}`} />
                        {formData.mainImageIndex === index ? (
                          <span className="absolute bottom-2 left-2 rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#8c6d45]">
                            Capa
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hidden space-y-3 md:block md:order-last">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl md:text-lg text-[#2a2421]">Galeria de Fotos</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[#8c6d45] font-bold">Capacidade: 10</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
                  {formData.images.map((image, index) => (
                    <div
                      key={index}
                      className={`group relative aspect-square overflow-hidden rounded-2xl border transition-all ${
                        formData.mainImageIndex === index ? "border-[#8c6d45] shadow-md" : "border-[#b08d57]/10 hover:border-[#b08d57]/35"
                      }`}
                    >
                      <img src={image} className="h-full w-full object-cover" alt={`Foto ${index + 1}`} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#2a2421]/60 opacity-0 transition-opacity group-hover:opacity-100">
                        {formData.mainImageIndex !== index ? (
                          <button
                            onClick={() => handleSetMain(index)}
                            className="rounded-full bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#5c4a33]"
                          >
                            Capa
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeletePhoto(index)}
                          className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#8c6d45]/35 bg-white text-[#8c6d45] transition hover:bg-[#b08d57]/5 hover:border-[#8c6d45] p-4"
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span className="text-[9px] uppercase font-black tracking-[0.18em] text-center">Adicionar Foto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#b08d57]/20 flex gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => onDiscard?.(formData)}
          className="flex-1 rounded-2xl bg-white border-2 border-[#b08d57]/20 py-4 text-xs font-black uppercase tracking-widest text-[#5c4a33] active:bg-[#f7f2ed] transition-all"
        >
          Descartar
        </button>
        <button
          onClick={handleSave}
          className="flex-[2] rounded-2xl bg-[#8c6d45] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 active:scale-[0.98] transition-all"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}

function CompactField({
  label,
  name,
  value,
  onChange,
  icon,
  type = "text",
  placeholder,
  listName
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  icon: ReactElement;
  type?: string;
  placeholder?: string;
  listName?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#5c4a33]">{label}</label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c6d45] transition-colors group-focus-within:text-[#2a2421]">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          list={listName}
          className="h-[52px] w-full rounded-2xl border border-[#b08d57]/22 bg-white px-4 pl-10 text-sm font-semibold text-[#2a2421] placeholder:text-[#bbaea0] focus:border-[#8c6d45] focus:outline-none focus:ring-4 focus:ring-[#8c6d45]/5"
        />
      </div>
    </div>
  );
}

function PriceField({
  label,
  name,
  value,
  onChange,
  onBlur,
  icon,
  placeholder
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  icon: ReactElement;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#5c4a33]">{label}</label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c6d45] transition-colors group-focus-within:text-[#2a2421]">
          {icon}
        </div>
        <input
          type="text"
          inputMode="decimal"
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="h-[52px] w-full rounded-2xl border border-[#b08d57]/22 bg-white px-4 pl-10 pb-0.5 text-sm font-semibold leading-none text-[#2a2421] placeholder:text-[#bbaea0] focus:border-[#8c6d45] focus:outline-none focus:ring-4 focus:ring-[#8c6d45]/5"
        />
      </div>
    </div>
  );
}

function normalizePriceInput(value: string) {
  const normalizedSource = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [integerPart = "", decimalRaw = ""] = normalizedSource.split(",");
  const decimalPart = decimalRaw.slice(0, 2);

  return decimalPart.length > 0 ? `${integerPart},${decimalPart}` : integerPart;
}

function parsePriceInput(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatPriceInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}
