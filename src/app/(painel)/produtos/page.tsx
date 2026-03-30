"use client";

import { ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import LabelCenter from "@/components/products/LabelCenter";
import { ProductDetail } from "@/components/products/ProductDetail";
import { ProductList } from "@/components/products/ProductList";
import { createProduct, deleteProduct, fetchConditionals, fetchCurrentTenantSettings, fetchProducts, updateProduct, uploadProductImage } from "@/lib/painel-api";
import { fetchProductFromCosmos } from "@/services/cosmosService";
import { Product } from "@/types";

type StockMeta = Record<string, { available: number; reserved: number }>;

function buildStockMeta(products: Product[], conditionals: Array<{ status: string; items: Array<{ productId: string; qtySent: number }> }>) {
  const reservedByProduct = conditionals
    .filter((conditional) => conditional.status === "open")
    .reduce<Record<string, number>>((acc, conditional) => {
      for (const item of conditional.items) {
        acc[item.productId] = (acc[item.productId] ?? 0) + item.qtySent;
      }

      return acc;
    }, {});

  return products.reduce<StockMeta>((acc, product) => {
    const reserved = reservedByProduct[product.id] ?? 0;
    acc[product.id] = {
      available: Math.max(0, product.stock - reserved),
      reserved
    };
    return acc;
  }, {});
}

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop";

function isLocalDraftProduct(productId: string) {
  return productId.startsWith("draft-");
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    images: [...product.images]
  };
}

function isTemporaryImageUrl(value: string) {
  return value.startsWith("blob:");
}

function generateInternalEan() {
  const randomPart = Math.floor(Math.random() * 100000000000).toString().padStart(11, "0");
  return `27${randomPart}`.slice(0, 13);
}

function createLocalDraftProduct(input?: Partial<Product>): Product {
  return {
    id: `draft-${crypto.randomUUID()}`,
    name: input?.name ?? "",
    price: input?.price ?? 0,
    stock: input?.stock ?? 0,
    images: input?.images?.length ? [...input.images] : [],
    mainImageIndex: input?.mainImageIndex ?? 0,
    category: input?.category ?? "",
    ean: input?.ean ?? "",
    isDraft: input?.isDraft ?? true,
    draftOrigin: input?.draftOrigin ?? "manual"
  };
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [conditionals, setConditionals] = useState<Array<{ status: string; items: Array<{ productId: string; qtySent: number }> }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showLabelCenter, setShowLabelCenter] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storeLabel, setStoreLabel] = useState("MBGifts");
  const persistedProductsRef = useRef<Record<string, Product>>({});
  const pendingImageFilesRef = useRef<Record<string, File>>({});

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const stockMeta = useMemo(() => buildStockMeta(products, conditionals), [conditionals, products]);
  const activeProducts = useMemo(
    () => products.filter((product) => !product.isDeleted),
    [products]
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category.trim())
            .filter(Boolean)
        )
      ).sort((first, second) => first.localeCompare(second, "pt-BR")),
    [products]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const [productsPayload, conditionalsPayload, tenant] = await Promise.all([
          fetchProducts(),
          fetchConditionals().catch(() => []),
          fetchCurrentTenantSettings().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        persistedProductsRef.current = Object.fromEntries(
          productsPayload.map((product) => [product.id, cloneProduct(product)])
        );
        setProducts(productsPayload);
        setConditionals(conditionalsPayload);
        setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
      } catch (error) {
        if (isMounted) {
          setFeedback(error instanceof Error ? error.message : "Falha ao carregar produtos.");
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshConditionals() {
    try {
      setConditionals(await fetchConditionals());
    } catch {
      // Mantemos a tela funcional mesmo se a carga auxiliar falhar.
    }
  }

  function handleCreateProduct() {
    setFeedback(null);
    const created = createLocalDraftProduct({
      price: 0,
      stock: 0,
      mainImageIndex: 0,
      ean: "",
      isDraft: true,
      draftOrigin: "manual"
    });

    setProducts((current) => [created, ...current]);
    setSelectedProductId(created.id);
  }

  async function handleEanNotFound(ean: string) {
    setIsSearching(true);
    setFeedback(null);

    try {
      const cosmosData = await fetchProductFromCosmos(ean);
      const created = createLocalDraftProduct({
        name: cosmosData?.description || "Novo Produto",
        price: 0,
        stock: 0,
        images: cosmosData?.thumbnail ? [cosmosData.thumbnail] : [DEFAULT_PRODUCT_IMAGE],
        mainImageIndex: 0,
        category: "Geral",
        ean,
        isDraft: true,
        draftOrigin: "cosmos"
      });

      setProducts((current) => [created, ...current]);
      setSelectedProductId(created.id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao buscar produto na Bluesoft.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleDetailUpdate(updated: Product) {
    setProducts((current) => current.map((product) => (product.id === updated.id ? updated : product)));
    setSelectedProductId(updated.id);
    setFeedback(null);
  }

  function handleRegisterPendingImages(entries: Array<{ file: File; previewUrl: string }>) {
    for (const entry of entries) {
      pendingImageFilesRef.current[entry.previewUrl] = entry.file;
    }
  }

  async function resolvePersistentImages(images: string[]) {
    const resolvedImages: string[] = [];

    for (const image of images) {
      const pendingFile = pendingImageFilesRef.current[image];
      if (!pendingFile) {
        resolvedImages.push(image);
        continue;
      }

      const uploaded = await uploadProductImage(pendingFile);
      resolvedImages.push(uploaded.publicUrl);
      URL.revokeObjectURL(image);
      delete pendingImageFilesRef.current[image];
    }

    return resolvedImages;
  }

  function releasePendingImages(images: string[]) {
    for (const image of images) {
      if (!isTemporaryImageUrl(image)) {
        continue;
      }

      URL.revokeObjectURL(image);
      delete pendingImageFilesRef.current[image];
    }
  }

  function handleDiscardProduct(productToDiscard: Product) {
    setFeedback(null);

    if (isLocalDraftProduct(productToDiscard.id)) {
      releasePendingImages(productToDiscard.images);
      setProducts((current) => current.filter((product) => product.id !== productToDiscard.id));
      setSelectedProductId(null);
      return;
    }

    const persistedSnapshot = persistedProductsRef.current[productToDiscard.id];
    if (!persistedSnapshot) {
      setFeedback("Não foi possível restaurar a última versão salva do produto.");
      return;
    }

    setProducts((current) =>
      current.map((product) => (product.id === productToDiscard.id ? cloneProduct(persistedSnapshot) : product))
    );
  }

  async function handleSaveProduct(productToSave: Product) {
    try {
      setFeedback(null);
      const resolvedEan = productToSave.ean.trim() || generateInternalEan();
      const persistentImages = await resolvePersistentImages(productToSave.images);

      const payload = {
        name: productToSave.name,
        price: productToSave.price,
        stock: productToSave.stock,
        images: persistentImages,
        mainImageIndex: productToSave.mainImageIndex,
        category: productToSave.category,
        ean: resolvedEan,
        isDraft: false
      };

      const persisted = isLocalDraftProduct(productToSave.id)
        ? await createProduct(payload)
        : await updateProduct(productToSave.id, payload);

      persistedProductsRef.current[persisted.id] = cloneProduct(persisted);
      if (isLocalDraftProduct(productToSave.id)) {
        delete persistedProductsRef.current[productToSave.id];
      }

      setProducts((current) =>
        current.map((product) => (product.id === productToSave.id ? persisted : product))
      );
      setSelectedProductId(persisted.id);
      await refreshConditionals();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar produto.");
    }
  }

  async function handleDeleteProduct(productToDelete: Product) {
    try {
      setFeedback(null);
      releasePendingImages(productToDelete.images);

      const result = await deleteProduct(productToDelete.id);
      const removedLabel = result.mode === "soft"
        ? "Produto arquivado porque já possui uso em outras áreas."
        : "Produto excluído permanentemente.";

      setProducts((current) => current.filter((product) => product.id !== productToDelete.id));
      delete persistedProductsRef.current[productToDelete.id];
      setSelectedProductId(null);
      setFeedback(removedLabel);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao excluir produto.");
    }
  }

  return (
    <div className="flex h-screen flex-col selection:bg-[#b08d57]/20">
      <header className="hidden h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white/65 px-8 shadow-sm relative backdrop-blur-md md:flex z-30">
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
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Gestão de Estoque</p>
          {isSearching ? (
            <div className="absolute top-full mt-2 bg-white px-4 py-2 rounded-full border border-amber-200 shadow-sm animate-pulse">
              <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Buscando na Bluesoft...</span>
            </div>
          ) : null}
          {!isSearching && feedback ? (
            <div className="absolute top-full mt-2 bg-white px-4 py-2 rounded-full border border-[#b08d57]/20 shadow-sm">
              <span className="text-[9px] font-black text-[#8c6d45] tracking-wide">{feedback}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLabelCenter(true)}
            className="flex items-center gap-2 rounded-full border-2 border-[#b08d57]/20 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5c4a33] hover:bg-[#faf8f5] hover:border-[#b08d57]/40 transition-all shadow-sm"
          >
            <Tag className="h-3.5 w-3.5" />
            Etiquetas
          </button>
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-2 rounded-full bg-[#8c6d45] px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38] hover:scale-105 active:scale-95 transition-all"
          >
            Novo Produto
          </button>
        </div>
      </header>

      <header className="md:hidden border-b border-[#b08d57]/15 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[#2a2421] transition-all"
          >
            <div className="rounded-full border border-[#b08d57]/20 bg-[#b08d57]/10 p-2">
              <ArrowLeft className="h-4 w-4 stroke-[3px]" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">Voltar</span>
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-serif text-xl uppercase tracking-[0.18em] text-[#2a2421]">{storeLabel}</p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.35em] text-[#8c6d45]">Estoque</p>
          </div>

          <button
            onClick={handleCreateProduct}
            className="rounded-full bg-[#8c6d45] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-md"
          >
            Novo
          </button>
        </div>

        {isSearching ? (
          <div className="mt-3 rounded-full border border-amber-200 bg-white px-4 py-2 text-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Buscando na Bluesoft...</span>
          </div>
        ) : null}

        {!isSearching && feedback ? (
          <div className="mt-3 rounded-2xl border border-[#b08d57]/20 bg-white px-4 py-2 text-center">
            <span className="text-[10px] font-black tracking-wide text-[#8c6d45]">{feedback}</span>
          </div>
        ) : null}
      </header>

      {showLabelCenter ? (
        <LabelCenter products={activeProducts} onClose={() => setShowLabelCenter(false)} storeLabel={storeLabel} />
      ) : null}

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`w-full md:w-80 lg:w-96 flex-shrink-0 z-20 overflow-hidden border-r-2 border-[#b08d57]/10 bg-[#faf8f5]/55 backdrop-blur-md transition-all duration-300 ${selectedProduct ? "hidden md:block" : "block"}`}>
          <ProductList
            products={activeProducts}
            selectedProductId={selectedProduct?.id}
            onSelectProduct={(product) => setSelectedProductId(product.id)}
            onEanNotFound={handleEanNotFound}
            stockMeta={stockMeta}
          />
        </aside>

        <main className={`flex-1 overflow-hidden relative z-10 bg-transparent transition-all duration-300 ${selectedProduct ? "block" : "hidden md:block"}`}>
          {selectedProduct ? (
            <div className="h-full flex flex-col">
              <div className="md:hidden p-4 bg-white border-b border-[#b08d57]/10 flex items-center justify-between">
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="flex items-center gap-2 text-[#8c6d45] font-bold text-xs uppercase tracking-widest"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Bipar / Lista
                </button>
                <div className="text-[10px] font-black text-[#5c4a33] uppercase">Modo Editor</div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ProductDetail
                  product={selectedProduct}
                  onUpdate={handleDetailUpdate}
                  onSave={handleSaveProduct}
                  onDiscard={handleDiscardProduct}
                  onDelete={handleDeleteProduct}
                  onImagesSelected={handleRegisterPendingImages}
                  canDelete={Boolean(selectedProduct && !isLocalDraftProduct(selectedProduct.id))}
                  categories={categoryOptions}
                  reservedStock={selectedProduct ? stockMeta[selectedProduct.id]?.reserved ?? 0 : 0}
                  availableStock={selectedProduct ? stockMeta[selectedProduct.id]?.available ?? selectedProduct.stock : 0}
                />
              </div>
            </div>
          ) : (
            <div className="hidden md:flex h-full flex-col items-center justify-center text-center p-12 opacity-50">
              <ProductDetail product={null} onUpdate={() => {}} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
