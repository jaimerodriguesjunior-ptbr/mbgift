"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X, Settings, Camera, Package, Gift, Trash2, Share2, Check, MessageSquare, Quote, Scan, Search, Eye, Image as ImageIcon, Plus } from "lucide-react";
import Link from "next/link";

import {
  addHostGiftListItem,
  fetchHostGiftList,
  fetchHostGiftListProducts,
  removeHostGiftListItem,
  uploadGiftListCover,
  updateHostGiftList
} from "@/lib/painel-api";
import type { GiftListRecord } from "@/lib/gift-lists/types";
import type { TenantStoreIdentity } from "@/lib/tenants/types";
import type { Product } from "@/types";

export default function HostListEditorPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [list, setList] = useState<GiftListRecord | null>(null);
  const [tenant, setTenant] = useState<TenantStoreIdentity | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"itens" | "recados">("itens");
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);
  const isDetectingRef = useRef(false);
  const scanStatusTimeoutRef = useRef<number | null>(null);
  const lastScanValueRef = useRef("");
  const scanCooldownUntilRef = useRef(0);
  const productsRef = useRef<Product[]>([]);
  const listRef = useRef<GiftListRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHostView() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const tenantSlug = searchParams.get("tenant") ?? undefined;
        const [giftListPayload, productsPayload] = await Promise.all([
          fetchHostGiftList(params.slug, token, tenantSlug),
          fetchHostGiftListProducts(params.slug, token, tenantSlug)
        ]);

        if (!isMounted) {
          return;
        }

        setList(giftListPayload.giftList);
        setTenant(giftListPayload.tenant);
        setAllProducts(productsPayload);
      } catch {
        if (isMounted) {
          setList(null);
          setTenant(null);
          setAllProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHostView();

    return () => {
      isMounted = false;
    };
  }, [params.slug, searchParams, token]);

  useEffect(() => {
    if (!isEditingMetadata && !isScannerOpen) {
      inputRef.current?.focus();
    }
  }, [isEditingMetadata, isScannerOpen]);

  useEffect(() => () => {
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    productsRef.current = allProducts;
  }, [allProducts]);

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => () => {
    stopScanner();
    clearScanStatusTimeout();
  }, []);

  function clearScanStatusTimeout() {
    if (scanStatusTimeoutRef.current !== null) {
      window.clearTimeout(scanStatusTimeoutRef.current);
      scanStatusTimeoutRef.current = null;
    }
  }

  function setTransientScanStatus(status: "success" | "error", durationMs = 1800) {
    clearScanStatusTimeout();
    setScanStatus(status);
    scanStatusTimeoutRef.current = window.setTimeout(() => {
      setScanStatus("idle");
      scanStatusTimeoutRef.current = null;
    }, durationMs);
  }

  function stopScanner() {
    if (scannerFrameRef.current !== null) {
      window.cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    barcodeDetectorRef.current = null;
    isDetectingRef.current = false;
  }

  function buildScanCandidates(rawValue: string) {
    const trimmed = rawValue.trim();
    const candidates = new Set<string>();

    if (trimmed) {
      candidates.add(trimmed);
    }

    const digitsOnly = trimmed.replace(/\D/g, "");
    if (digitsOnly.length >= 8) {
      candidates.add(digitsOnly);
    }

    const digitGroups = trimmed.match(/\d{8,14}/g) ?? [];
    for (const group of digitGroups) {
      candidates.add(group);
    }

    return [...candidates];
  }

  function resolveProductFromScan(rawValue: string) {
    const candidates = buildScanCandidates(rawValue);
    return productsRef.current.find((product) => candidates.includes(product.ean));
  }

  useEffect(() => {
    if (searchTerm.length < 8) {
      return;
    }

    const product = resolveProductFromScan(searchTerm);
    if (product) {
      void processScannedValue(searchTerm, {
        clearInput: true,
        reportMissing: true
      });
      return;
    }

    const digitsOnly = searchTerm.replace(/\D/g, "");
    if (searchTerm.length >= 13 || digitsOnly.length >= 13) {
      void processScannedValue(searchTerm, {
        clearInput: true,
        reportMissing: true
      });
    }
  }, [searchTerm]);

  async function handleAddProduct(product: Product) {
    if (!list || !token) {
      return;
    }

    if (list.items.some((item) => item.productId === product.id)) {
      window.alert("Este produto já está na sua lista.");
      return;
    }

    try {
      const updated = await addHostGiftListItem(params.slug, {
        token,
        productId: product.id,
        note: "Item escolhido na loja via scanner.",
        tenantSlug: tenant?.slug
      });

      if (updated) {
        setList(updated);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao adicionar item.");
    }
  }

  async function handleMockScan() {
    const availableProducts = allProducts.filter((product) => !list?.items.some((item) => item.productId === product.id));
    if (availableProducts.length === 0) {
      window.alert("Você já adicionou todos os produtos disponíveis.");
      setIsScannerOpen(false);
      return;
    }

    const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
    await handleAddProduct(randomProduct);
    setScanStatus("success");
    window.setTimeout(() => {
      setScanStatus("idle");
      setIsScannerOpen(false);
    }, 1500);
  }

  async function handleScannerProductAdd(product: Product) {
    const currentList = listRef.current;
    if (!currentList || !token) {
      return "error" as const;
    }

    if (currentList.items.some((item) => item.productId === product.id)) {
      return "duplicate" as const;
    }

    try {
      const updated = await addHostGiftListItem(params.slug, {
        token,
        productId: product.id,
        note: "Item escolhido na loja via scanner.",
        tenantSlug: tenant?.slug
      });

      if (updated) {
        setList(updated);
        return "added" as const;
      }

      return "error" as const;
    } catch {
      return "error" as const;
    }
  }

  async function processScannedValue(
    rawValue: string,
    options?: {
      clearInput?: boolean;
      reportMissing?: boolean;
    }
  ) {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    const now = Date.now();
    if (lastScanValueRef.current === trimmed && now < scanCooldownUntilRef.current) {
      return;
    }

    lastScanValueRef.current = trimmed;
    scanCooldownUntilRef.current = now + 1500;

    const product = resolveProductFromScan(trimmed);
    if (product) {
      const result = await handleScannerProductAdd(product);

      if (result === "added") {
        setScannerFeedback(`Produto adicionado: ${product.name}`);
        setTransientScanStatus("success");
      } else if (result === "duplicate") {
        setScannerFeedback("Este produto já está na lista.");
        setTransientScanStatus("error");
      } else {
        setScannerFeedback("Não foi possível adicionar este produto.");
        setTransientScanStatus("error");
      }

      if (options?.clearInput) {
        setSearchTerm("");
      }
      return;
    }

    if (options?.reportMissing) {
      setScannerFeedback("Nenhum produto encontrado para este código.");
      setTransientScanStatus("error");

      if (options.clearInput) {
        setSearchTerm("");
      }
    }
  }

  function scanFrame() {
    scannerFrameRef.current = window.requestAnimationFrame(scanFrame);

    const video = videoRef.current;
    const detector = barcodeDetectorRef.current;
    if (!isScannerOpen || !video || !detector || isDetectingRef.current) {
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    isDetectingRef.current = true;

    void detector.detect(video)
      .then(async (codes) => {
        const detectedValue = codes.find((code) => typeof code.rawValue === "string" && code.rawValue.trim().length > 0)?.rawValue;
        if (detectedValue) {
          await processScannedValue(detectedValue, {
            clearInput: true,
            reportMissing: true
          });
        }
      })
      .catch(() => {
        // Mantemos o scanner ativo mesmo se um frame falhar.
      })
      .finally(() => {
        isDetectingRef.current = false;
      });
  }

  useEffect(() => {
    if (!isScannerOpen) {
      stopScanner();
      return;
    }

    let isCancelled = false;

    async function startScanner() {
      setScannerFeedback("Aponte a câmera para o código de barras ou QR code.");

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerFeedback("Este navegador não liberou acesso a câmera.");
        return;
      }

      const BarcodeDetectorCtor = window.BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setScannerFeedback("Este dispositivo não suporta leitura nativa de código pela câmera.");
        return;
      }

      try {
        const preferredFormats: BarcodeDetectorFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];
        const supportedFormats = typeof BarcodeDetectorCtor.getSupportedFormats === "function"
          ? await BarcodeDetectorCtor.getSupportedFormats()
          : preferredFormats;

        const formats = preferredFormats.filter((format) => supportedFormats.includes(format));
        barcodeDetectorRef.current = new BarcodeDetectorCtor({
          formats: formats.length > 0 ? formats : preferredFormats
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" }
          }
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          throw new Error("Elemento de vídeo não disponível.");
        }

        video.srcObject = stream;
        video.muted = true;
        await video.play();
        scanFrame();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao abrir a câmera.";
        if (/permission|denied|notallowed/i.test(message)) {
          setScannerFeedback("Permissão da câmera negada. Você pode continuar bipando pelo campo manual.");
        } else {
          setScannerFeedback("Não foi possível iniciar a câmera neste dispositivo.");
        }
        stopScanner();
      }
    }

    void startScanner();

    return () => {
      isCancelled = true;
      stopScanner();
    };
  }, [isScannerOpen]);

  async function handleRemoveItem(itemId: string) {
    if (!list || !token) {
      return;
    }

    try {
      const updated = await removeHostGiftListItem(params.slug, itemId, token, tenant?.slug);
      if (updated) {
        setList(updated);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao remover item.");
    }
  }

  async function handleSaveMetadata() {
    if (!list || !token) {
      return;
    }

    try {
      setIsSavingMetadata(true);
      let coverImageUrl = list.photo;

      if (pendingCoverFile) {
        const upload = await uploadGiftListCover(pendingCoverFile, {
          giftListSlug: params.slug,
          hostToken: token,
          tenantSlug: tenant?.slug
        });
        coverImageUrl = upload.publicUrl;
      }

      const payload = await updateHostGiftList(params.slug, token, {
        hostName: list.hostName,
        eventDate: list.eventDate,
        city: list.city,
        headline: list.headline,
        coverImageUrl,
        tenantSlug: tenant?.slug
      });

      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = null;
      }

      setList(payload.giftList);
      setTenant(payload.tenant);
      setPendingCoverFile(null);
      setIsEditingMetadata(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao atualizar lista.");
    } finally {
      setIsSavingMetadata(false);
    }
  }

  function handleCoverSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (!list) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    coverPreviewUrlRef.current = previewUrl;
    setPendingCoverFile(file);
    setList({
      ...list,
      photo: previewUrl,
      coverImageUrl: previewUrl
    });
  }

  const getProductDetails = (id: string) => {
    const productFromList = list?.items.find((item) => item.productId === id)?.product;
    return productFromList ?? allProducts.find((product) => product.id === id);
  };

  const storeLabel = tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts";
  const trimmedSearchTerm = searchTerm.trim();
  const selectedProductIds = new Set(list?.items.map((item) => item.productId) ?? []);
  const isCodeInput = /^\d{8,14}$/.test(trimmedSearchTerm);
  const manualSearchResults = trimmedSearchTerm.length >= 2 && !isCodeInput
    ? allProducts
      .filter((product) => !selectedProductIds.has(product.id))
      .filter((product) => {
        const normalizedNeedle = trimmedSearchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(normalizedNeedle) ||
          product.category.toLowerCase().includes(normalizedNeedle) ||
          product.ean.includes(trimmedSearchTerm)
        );
      })
      .slice(0, 6)
    : [];
  const showManualSearchResults = activeTab === "itens" && !isScannerOpen && trimmedSearchTerm.length >= 2 && !isCodeInput;

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center bg-[#fefcfb]">
        <div className="h-20 w-20 rounded-full bg-[#f7f2ed] flex items-center justify-center text-[#8c6d45] mb-6 shadow-xl shadow-[#b08d57]/10">
          <Search className="h-10 w-10 opacity-30" />
        </div>
        <h2 className="font-serif text-3xl text-[#2a2421] mb-2">Carregando lista</h2>
        <p className="text-sm text-[#8c6d45] uppercase tracking-widest max-w-xs leading-relaxed">
          Aguarde um instante.
        </p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center bg-[#fefcfb]">
        <div className="h-20 w-20 rounded-full bg-[#f7f2ed] flex items-center justify-center text-[#8c6d45] mb-6 shadow-xl shadow-[#b08d57]/10">
          <Search className="h-10 w-10 opacity-30" />
        </div>
        <h2 className="font-serif text-3xl text-[#2a2421] mb-2">Lista não Encontrada</h2>
        <p className="text-sm text-[#8c6d45] uppercase tracking-widest max-w-xs leading-relaxed">
          O link utilizado parece estar incorreto ou a lista ainda não foi processada no banco de dados.
        </p>
        <Link href="/listas" className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-[#5c4a33] border-b-2 border-[#b08d57]/30 pb-1 hover:border-[#8c6d45] transition-all">
          Voltar para Listas
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center bg-[#fefcfb]">
        <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
          <X className="h-10 w-10" />
        </div>
        <h2 className="font-serif text-3xl text-[#2a2421] mb-2 text-balance">Acesso Não Autorizado</h2>
        <p className="text-sm text-[#8c6d45] uppercase tracking-widest max-w-xs leading-relaxed">
          Este link de edição expirou ou é inválido. Por favor, utilize o link enviado pela loja.
        </p>
        <Link href="/" className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-[#5c4a33] border-b-2 border-[#b08d57]/30 pb-1">
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#fefcfb] selection:bg-[#b08d57]/20">
      <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white px-6 md:px-12 z-40 shadow-sm relative">
        <div className="w-10" />

        <div className="flex flex-col items-center">
          <h1 className="font-serif text-2xl md:text-3xl text-[#2a2421] tracking-[0.2em] uppercase leading-none">{storeLabel}</h1>
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.5em] text-[#8c6d45] font-black mt-2">Painel do Anfitrião</p>
        </div>

        <div className="flex items-center">
          <Link
            href={`/lista/${params.slug}?preview=host&returnToken=${encodeURIComponent(token)}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f2ed] border border-[#b08d57]/20 text-[#8c6d45] hover:bg-[#8c6d45] hover:text-white transition-all shadow-sm group"
            title="Ver como Convidado"
          >
            <Eye className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="relative h-44 md:h-80 overflow-hidden">
          <img
            src={list.photo}
            className="h-full w-full object-cover grayscale-[20%] opacity-80"
            alt={list.brideName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a2421] via-transparent to-transparent flex flex-col justify-end p-6 md:p-12">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest border border-white/30">
                {list.city}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#b08d57]/40 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest border border-white/20">
                {new Date(list.eventDate).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-3xl md:text-6xl text-white tracking-tight leading-none">{list.brideName}</h2>
              <button
                onClick={() => setIsEditingMetadata(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full border border-white/30 text-white transition-all group"
              >
                <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="rounded-3xl border border-[#8c6d45]/30 bg-[#eadfd3]/70 p-4 shadow-[0_14px_35px_rgba(92,74,51,0.08)] backdrop-blur-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-white/90 rounded-xl flex items-center justify-center text-[#8c6d45] shadow-sm flex-shrink-0 border border-white/70">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif text-sm text-[#2a2421]">Divulgar Lista</h4>
                <p className="text-[8px] uppercase tracking-widest font-black text-[#8c6d45] opacity-70">
                  Envie o link para seus convidados
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const publicLink = `${window.location.origin}/lista/${params.slug}`;
                const message = encodeURIComponent(`Oi pessoal! Criamos nossa lista de presentes na ${storeLabel}. Confiram os itens que escolhemos com carinho: ${publicLink}`);
                window.open(`https://wa.me/?text=${message}`, "_blank");
              }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#25d366]/25 bg-[#25d366] text-white shadow-lg shadow-[#25d366]/20 transition-all hover:bg-[#1ebe5b] active:scale-90"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="h-5 w-5 brightness-0 invert" alt="" />
            </button>
          </div>
        </div>

        <div className="sticky top-0 z-30 border-b border-[#b08d57]/15 bg-[#f7f0e8]/92 px-6 pb-4 pt-8 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl rounded-[2rem] border border-[#b08d57]/25 bg-[#e8d7c4] p-2 shadow-[0_14px_34px_rgba(92,74,51,0.12)]">
            <button
              onClick={() => setActiveTab("itens")}
              className={`flex flex-1 items-center justify-center gap-3 rounded-[1.4rem] px-5 py-4 text-left transition-all ${
                activeTab === "itens"
                  ? "bg-[#fffaf4] text-[#2a2421] shadow-md shadow-[#8c6d45]/15"
                  : "bg-transparent text-[#6e5738] hover:bg-[#f8efe5]"
              }`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                activeTab === "itens" ? "bg-[#8c6d45] text-white" : "bg-[#d8c0a5] text-[#6e5738]"
              }`}>
                <Package className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-[0.22em]">Sua Escolha</div>
                <div className={`text-[9px] font-black uppercase tracking-[0.18em] ${
                  activeTab === "itens" ? "text-[#8c6d45]" : "text-[#7d6646]"
                }`}>
                  Produtos da lista
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("recados")}
              className={`flex flex-1 items-center justify-center gap-3 rounded-[1.4rem] px-5 py-4 text-left transition-all ${
                activeTab === "recados"
                  ? "bg-[#fffaf4] text-[#2a2421] shadow-md shadow-[#8c6d45]/15"
                  : "bg-transparent text-[#6e5738] hover:bg-[#f8efe5]"
              }`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                activeTab === "recados" ? "bg-[#8c6d45] text-white" : "bg-[#d8c0a5] text-[#6e5738]"
              }`}>
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-[0.22em]">Recados</div>
                <div className={`text-[9px] font-black uppercase tracking-[0.18em] ${
                  activeTab === "recados" ? "text-[#8c6d45]" : "text-[#7d6646]"
                }`}>
                  Mensagens recebidas
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-4xl p-6 pb-52 md:p-12 md:pb-56">
          {activeTab === "itens" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-serif text-3xl text-[#2a2421]">Itens Escolhidos</h3>
                  <p className="text-[10px] uppercase tracking-widest font-black text-[#8c6d45] opacity-60">Escolha os produtos bipando o código</p>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-[#8c6d45]/5 border border-[#8c6d45]/20 text-[#8c6d45] text-xs font-black uppercase tracking-wider">
                  {list.items.length} Itens
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {list.items.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-[#fdfbf7] rounded-[3rem] border-2 border-[#b08d57]/10 border-dashed">
                    <div className="h-16 w-16 bg-[#b08d57]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#8c6d45]">
                      <Gift className="h-8 w-8 stroke-1" />
                    </div>
                    <h4 className="font-serif text-xl text-[#2a2421]">Lista Vazia</h4>
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-[#8c6d45] font-black">Use o scanner abaixo para começar</p>
                  </div>
                ) : (
                  list.items.map((item) => {
                    const product = getProductDetails(item.productId);
                    return (
                      <div key={item.id} className="group relative flex items-center gap-4 p-4 rounded-3xl bg-white border border-[#b08d57]/10 shadow-sm hover:shadow-xl hover:shadow-[#b08d57]/5 hover:border-[#b08d57]/30 transition-all duration-500">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-[#f7f2ed]">
                          <img src={product?.images[0]} className="h-full w-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-lg text-[#2a2421] truncate">{product?.name}</h4>
                          <p className="text-[10px] font-black text-[#8c6d45] uppercase tracking-wider">
                            R$ {product?.price.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            void handleRemoveItem(item.id);
                          }}
                          className="h-10 w-10 flex-shrink-0 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                          title="Remover Item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <h2 className="font-serif text-3xl text-[#2a2421]">Mural de Recados</h2>
                <p className="text-[10px] uppercase tracking-widest font-black text-[#8c6d45] opacity-60">Mensagens carinhosas de seus convidados</p>
              </div>

              <div className="grid gap-6">
                {list.items.filter((item) => item.guestMessage).length > 0 ? (
                  list.items.filter((item) => item.guestMessage).map((item) => (
                    <div key={item.id} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-[#8c6d45]/5 border border-[#8c6d45]/10 relative overflow-hidden group">
                      <Quote className="absolute -top-4 -right-4 h-24 w-24 text-[#8c6d45]/5 rotate-12 transition-transform group-hover:rotate-0" />

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-4 max-w-2xl">
                          <p className="font-serif text-xl md:text-2xl text-[#5c4a33] italic leading-relaxed">
                            "{item.guestMessage}"
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-[#f7f2ed] border border-[#8c6d45]/20 flex items-center justify-center text-[#8c6d45]">
                              <Check className="h-4 w-4" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#2a2421]">
                              {item.guestName} <span className="text-[#8c6d45] ml-2 opacity-50">— {getProductDetails(item.productId)?.name}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#f7f2ed]/50 rounded-[3rem] p-20 text-center border-2 border-dashed border-[#8c6d45]/20">
                    <p className="font-serif text-2xl text-[#8c6d45]/40 italic">As mensagens aparecerão aqui assim que seus convidados começarem a reservar os presentes.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {activeTab === "itens" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-[#b08d57]/20 px-6 py-6 z-50 shadow-[0_-20px_40px_rgba(176,141,87,0.1)] animate-in slide-in-from-bottom-full duration-500">
          <div className="mx-auto max-w-2xl space-y-3">
            {showManualSearchResults && (
              <div className="overflow-hidden rounded-[1.8rem] border border-[#b08d57]/20 bg-white shadow-[0_18px_40px_rgba(176,141,87,0.12)]">
                {manualSearchResults.length > 0 ? (
                  <div className="divide-y divide-[#b08d57]/10">
                    {manualSearchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSearchTerm("");
                          void handleAddProduct(product);
                        }}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-all hover:bg-[#fdf8f1]"
                      >
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border border-[#b08d57]/10 bg-[#f7f2ed]">
                          {product.images[0] ? (
                            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#8c6d45]">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-lg text-[#2a2421]">{product.name}</p>
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8c6d45] opacity-70">
                            {product.category || "Sem categoria"} {product.ean ? `• ${product.ean}` : ""}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#8c6d45] text-white shadow-sm">
                          <Plus className="h-4 w-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45] opacity-75">
                      Nenhum produto encontrado para essa busca
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
              <div className={`absolute left-0 top-1/2 flex h-10 w-14 -translate-y-1/2 items-center justify-center gap-1.5 transition-colors ${
                scanStatus === "success" ? "text-green-500" : scanStatus === "error" ? "text-red-500" : "text-[#8c6d45]"
              }`}>
                {scanStatus === "success" ? (
                  <Check className="h-6 w-6 animate-bounce" />
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <Scan className="h-4 w-4" />
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="BIPAR CÓDIGO OU BUSCAR PRODUTO"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                autoFocus
                className={`w-full rounded-2xl border-2 bg-white py-4 pl-16 pr-4 text-xs font-black uppercase tracking-[0.2em] text-[#2a2421] placeholder-[#a69b8f]/60 focus:outline-none focus:ring-8 transition-all ${
                  scanStatus === "success"
                    ? "border-green-500 ring-green-500/10"
                    : scanStatus === "error"
                      ? "border-red-500 ring-red-500/10"
                      : "border-[#b08d57]/20 focus:border-[#8c6d45] focus:ring-[#8c6d45]/5"
                }`}
              />
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="h-14 w-14 rounded-2xl bg-[#8c6d45] text-white flex items-center justify-center shadow-xl shadow-[#8c6d45]/20 active:scale-90 transition-transform"
            >
              <Camera className="h-6 w-6" />
            </button>
            </div>
          </div>
        </div>
      )}

      {isEditingMetadata && list && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#2a2421]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500">
            <button onClick={() => setIsEditingMetadata(false)} className="absolute top-8 right-8 text-[#a69b8f] hover:text-[#2a2421]">
              <X className="h-6 w-6" />
            </button>

            <div className="text-center mb-10">
              <div className="h-16 w-16 bg-[#f7f2ed] rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#8c6d45]">
                <Settings className="h-8 w-8" />
              </div>
              <h3 className="font-serif text-3xl text-[#2a2421]">Ajustes da Lista</h3>
              <p className="text-[10px] uppercase tracking-widest font-black text-[#8c6d45] opacity-60 mt-2">Personalize sua presença digital</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#8c6d45] ml-1">Mensagem Destaque</label>
                <textarea
                  className="w-full rounded-2xl border-2 border-[#b08d57]/10 bg-[#fdfbf7] p-4 text-sm font-medium focus:border-[#8c6d45] outline-none transition-all"
                  rows={3}
                  value={list.headline}
                  onChange={(event) => setList({ ...list, headline: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#8c6d45] ml-1">Foto de Capa</label>
                <div className="rounded-2xl border-2 border-[#b08d57]/10 bg-[#fdfbf7] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#8c6d45] shadow-sm">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#2a2421]">
                        {pendingCoverFile ? pendingCoverFile.name : "Capa atual da lista"}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45] opacity-60">
                        {pendingCoverFile ? "Imagem pronta para salvar" : "Escolha outra imagem para atualizar a capa"}
                      </p>
                    </div>
                    <label className="cursor-pointer rounded-2xl border border-[#b08d57]/20 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45] transition-all hover:border-[#8c6d45]">
                      Selecionar
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverSelection}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  void handleSaveMetadata();
                }}
                disabled={isSavingMetadata}
                className="w-full rounded-2xl bg-[#2a2421] py-5 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-[70] bg-black animate-in fade-in duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border-2 border-white/20 bg-zinc-900">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative h-48 w-64 rounded-xl border-2 border-white/50 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]">
                  <div className="absolute left-0 top-0 h-1 w-full bg-[#8c6d45] shadow-[0_0_15px_#8c6d45] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>

              {scanStatus === "success" && (
                <div className="absolute inset-0 bg-[#8c6d45]/40 backdrop-blur-sm flex items-center justify-center animate-in zoom-in duration-300">
                  <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-[#8c6d45]">
                    <Check className="h-12 w-12 stroke-[3px]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-20 flex flex-col items-center gap-8 px-8">
            <div className="text-center space-y-2">
              <h3 className="text-white font-serif text-2xl">Aponte para o Código</h3>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">Leitura contínua ativa enquanto a câmera estiver aberta</p>
              <p className="mx-auto max-w-xs text-sm font-semibold text-white/80">
                {scannerFeedback}
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-white/20"
            >
              Fechar Scanner
            </button>
          </div>

          <style jsx>{`
            @keyframes scan {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(192px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
