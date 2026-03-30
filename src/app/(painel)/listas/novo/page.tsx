"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Gift, Calendar, MapPin,
  User, Image as ImageIcon, Sparkles, Check
} from "lucide-react";
import Link from "next/link";
import { createGiftList, fetchClients, fetchCurrentTenantSettings, uploadGiftListCover } from "@/lib/painel-api";
import type { Client } from "@/types";

const DEFAULT_GIFT_LIST_COVER_URL = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop";

export default function NovaListaPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [storeLabel, setStoreLabel] = useState("MBGifts");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const coverPreviewUrlRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    brideName: "",
    eventDate: "",
    city: "",
    headline: "",
    photo: DEFAULT_GIFT_LIST_COVER_URL,
    slug: ""
  });

  const [createdList, setCreatedList] = useState<{ slug: string, token: string } | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      try {
        const [data, tenant] = await Promise.all([
          fetchClients(),
          fetchCurrentTenantSettings().catch(() => null)
        ]);
        if (isMounted) {
          setClients(data);
          setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
        }
      } catch (error) {
        if (isMounted) {
          window.alert(error instanceof Error ? error.message : "Falha ao carregar clientes.");
        }
      }
    }

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setClienteId(params.get("clienteId"));
  }, []);

  useEffect(() => {
    if (clienteId) {
      const foundClient = clients.find(c => c.id === clienteId);
      if (foundClient) {
        setClient(foundClient);
        setFormData(prev => ({
          ...prev,
          brideName: foundClient.name,
          city: foundClient.address?.split("-")[1]?.trim() || ""
        }));
      }
    }
  }, [clienteId, clients]);

  useEffect(() => () => {
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === "brideName" ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') } : {})
    }));
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setCoverFile(file);
    setFormData((prev) => ({
      ...prev,
      photo: previewUrl
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const slug = formData.slug || formData.brideName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      let coverImageUrl = formData.photo;

      if (coverFile) {
        const upload = await uploadGiftListCover(coverFile);
        coverImageUrl = upload.publicUrl;
      }

      const result = await createGiftList({
        slug,
        hostName: formData.brideName,
        eventDate: formData.eventDate,
        city: formData.city,
        headline: formData.headline,
        coverImageUrl
      });

      if (!result.giftList || !result.hostAccessToken) {
        throw new Error("A API não retornou os dados da nova lista.");
      }

      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = null;
      }

      setCoverFile(null);
      setFormData((prev) => ({
        ...prev,
        photo: coverImageUrl
      }));
      setCreatedList({ slug: result.giftList.slug, token: result.hostAccessToken });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha ao criar lista.");
    } finally {
      setIsSaving(false);
    }
  };

  const hostLink = createdList ? `${window.location.origin}/lista/${createdList.slug}/editar?token=${createdList.token}` : "";

  const handleWhatsAppShare = () => {
    if (!client || !createdList) return;
    const phone = client.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${formData.brideName}! Sua lista na ${storeLabel} está pronta.\n\n` +
      `🔗 Link para você gerenciar e escanear produtos: ${hostLink}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (createdList) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-[#fefcfb]">
        <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white px-8 z-30 shadow-sm relative">
          <Link href="/listas" className="flex items-center gap-3 text-[#2a2421] hover:text-[#8c6d45] transition-all group">
            <div className="rounded-full bg-[#b08d57]/10 p-2.5 group-hover:bg-[#b08d57]/20 group-hover:scale-110 transition-all border-2 border-[#b08d57]/20">
              <ArrowLeft className="h-4 w-4 stroke-[3px]" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Voltar para Listas</span>
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="font-serif text-3xl text-[#2a2421] tracking-[0.25em] uppercase">LISTA ATIVA</h1>
            <div className="h-[2px] w-12 bg-[#8c6d45] my-1" />
            <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Sucesso no Cadastro</p>
          </div>
          <div className="w-24" />
        </header>

        <main className="flex-1 overflow-y-auto bg-[#fdfbf7]/30 px-6 py-8 lg:px-12 lg:py-10">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 text-center">
            <div className="relative inline-block self-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-600 shadow-2xl shadow-green-500/10">
                <Check className="h-10 w-10 stroke-[3px]" />
              </div>
              <Sparkles className="absolute -right-2 -top-2 h-7 w-7 text-[#b08d57] animate-pulse" />
            </div>

            <div className="space-y-3">
              <h2 className="font-serif text-4xl text-[#2a2421]">Lista Criada com Excelência!</h2>
              <p className="mx-auto max-w-md text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-[#8c6d45]">
                Tudo pronto para os noivos começarem a bipar os produtos pela loja.
              </p>
            </div>

            <div className="text-left">
              <div className="space-y-4 rounded-[2.5rem] border-2 border-[#b08d57]/35 bg-white p-8 shadow-[0_20px_50px_rgba(176,141,87,0.15)] transition-all hover:shadow-[0_30px_60px_rgba(176,141,87,0.22)]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#5c4a33]">Link do Anfitrião (Edição + Scanner)</h4>
                  <span className="px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-[9px] font-black uppercase tracking-widest leading-none border border-amber-200">Privado</span>
                </div>
                <div className="flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-[#b08d57]/20 bg-[#fdfbf7] p-4 shadow-inner">
                  <p className="flex-1 truncate text-xs font-semibold italic text-[#2a2421] opacity-70">{hostLink}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(hostLink)}
                    className="flex-shrink-0 px-4 py-2 bg-white rounded-xl border border-[#b08d57]/30 shadow-sm text-[10px] font-black uppercase tracking-widest text-[#8c6d45] hover:bg-[#8c6d45] hover:text-white transition-all"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleWhatsAppShare}
                className="flex w-full items-center justify-center gap-4 rounded-3xl bg-[#25d366] py-5 text-sm font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-[#25d366]/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="h-6 w-6 invert brightness-0" alt="" />
                Enviar Link ao Anfitrião
              </button>

              <Link
                href="/listas"
                className="block p-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#a69b8f] hover:text-[#8c6d45] transition-colors"
              >
                Concluir e Voltar
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fefcfb]">
      {/* Premium Unified Header */}
      <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white px-8 z-30 shadow-sm relative">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-3 text-[#2a2421] hover:text-[#8c6d45] transition-all group"
        >
          <div className="rounded-full bg-[#b08d57]/10 p-2.5 group-hover:bg-[#b08d57]/20 group-hover:scale-110 transition-all border-2 border-[#b08d57]/20">
            <ArrowLeft className="h-4 w-4 stroke-[3px]" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Voltar</span>
        </button>

        <div className="flex flex-col items-center">
          <h1 className="font-serif text-3xl text-[#2a2421] tracking-[0.25em] uppercase">NOVA LISTA</h1>
          <div className="h-[2px] w-12 bg-[#8c6d45] my-1" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Cadastro de Evento</p>
        </div>

        <div className="w-24" />
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 lg:p-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-16 lg:grid-cols-[1fr_350px]">

            {/* Form Section */}
            <div className="space-y-12">
              <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-[#b08d57]/10 pb-4 text-[#8c6d45]">
                  <Sparkles className="h-6 w-6" />
                  <h2 className="font-serif text-3xl text-[#2a2421]">Identidade do Evento</h2>
                </div>

                <div className="space-y-8">
                  <FormField
                    label="Nome do evento"
                    name="brideName"
                    value={formData.brideName}
                    onChange={handleChange}
                    placeholder="Ex: Camila & Ana"
                    icon={<User className="h-5 w-5" />}
                  />

                  <div className="grid gap-8 md:grid-cols-2">
                    <FormField
                      label="Data do Evento"
                      name="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={handleChange}
                      icon={<Calendar className="h-5 w-5" />}
                    />
                    <FormField
                      label="Cidade / Local"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ex: Campinas, SP"
                      icon={<MapPin className="h-5 w-5" />}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-[0.25em] font-extrabold text-[#5c4a33] ml-1">Mensagem de Boas-vindas</label>
                    <textarea
                      name="headline"
                      value={formData.headline}
                      onChange={handleChange}
                      rows={3}
                      className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-white py-4 px-6 text-base font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-8 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
                      placeholder="Uma breve saudação aos convidados..."
                    ></textarea>
                  </div>

                  <div className="space-y-3">
                    <label className="ml-1 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#5c4a33]">Foto principal</label>
                    <div className="rounded-2xl border-2 border-[#b08d57]/20 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#8c6d45]/10 text-[#8c6d45]">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2a2421]">
                            {coverFile ? coverFile.name : "Capa padrão ativa"}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45] opacity-70">
                            {coverFile ? "Imagem pronta para envio" : "Escolha uma imagem para salvar no storage"}
                          </p>
                        </div>
                        <label className="cursor-pointer rounded-2xl border border-[#b08d57]/30 bg-[#fdfbf7] px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#8c6d45] transition-all hover:border-[#8c6d45] hover:bg-white">
                          Selecionar
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-6">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full rounded-3xl bg-[#8c6d45] py-6 text-sm font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-[#8c6d45]/30 hover:bg-[#725a38] hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isSaving ? "Criando Lista..." : "Criar Lista e Definir Produtos"}
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <aside className="hidden lg:block space-y-8">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#a69b8f]">Pré-visualização</h4>

              <div className="rounded-[3rem] overflow-hidden bg-white shadow-2xl border border-[#b08d57]/10 group transition-all">
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={formData.photo}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    alt="Preview"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <h3 className="font-serif text-2xl leading-none">{formData.brideName || "Nomes aqui..."}</h3>
                    <p className="text-[10px] uppercase tracking-widest mt-2 opacity-80">{formData.city || "Cidade aqui..."}</p>
                  </div>
                </div>
                <div className="p-8 text-center bg-[#fdfbf7]/50">
                  <div className="h-1 w-12 bg-[#8c6d45] mx-auto mb-6 opacity-30" />
                  <p className="font-serif text-[#5c4a33] italic text-sm line-clamp-3">
                    {formData.headline || "A sua mensagem para os convidados aparecerá aqui."}
                  </p>
                </div>
              </div>

            </aside>

          </div>
        </div>
      </main>
    </div>
  );
}

function FormField({ label, name, value, onChange, icon, placeholder = "", type = "text" }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: any; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] uppercase tracking-[0.25em] font-extrabold text-[#5c4a33] ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c6d45] group-focus-within:text-[#2a2421] transition-colors">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border-2 border-[#b08d57]/20 bg-white py-4 pl-12 pr-4 text-base font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-8 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
        />
      </div>
    </div>
  );
}
