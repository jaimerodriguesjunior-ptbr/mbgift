"use client";

import { MessageCircle, Camera, Phone, User, Check, Star, MapPin, CreditCard, Gift, ClipboardList, ArrowUpRight, Mail } from "lucide-react";
import { useState, ReactElement, useEffect } from "react";
import Link from "next/link";
import { Client, ConditionalRecord } from "@/types";

interface CustomerDetailProps {
  client: Client | null;
  onUpdate: (client: Client) => void;
  onSave: (client: Client) => Promise<void> | void;
  isSaving: boolean;
  onDelete: (client: Client) => Promise<void> | void;
  isDeleting: boolean;
  conditionals?: ConditionalRecord[];
}

function getConditionalDerivedStatus(conditional: ConditionalRecord) {
  if (conditional.status !== "open") {
    return conditional.status;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${conditional.dueDate}T00:00:00`);
  if (dueDate.getTime() < today.getTime()) {
    return "late";
  }

  if (dueDate.getTime() === today.getTime()) {
    return "due_today";
  }

  return "open";
}

function getConditionalValue(conditional: ConditionalRecord) {
  return conditional.items.reduce((sum, item) => sum + item.unitPrice * item.qtySent, 0);
}

export function CustomerDetail({ client, onUpdate, onSave, isSaving, onDelete, isDeleting, conditionals = [] }: CustomerDetailProps) {
  const [formData, setFormData] = useState<Client | null>(client);
  const [previewInstagram, setPreviewInstagram] = useState(client?.instagram ?? "");

  useEffect(() => {
    setFormData(client);
    setPreviewInstagram(client?.instagram ?? "");
  }, [client?.id]);

  useEffect(() => {
    if (!formData) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviewInstagram(formData.instagram);
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData?.instagram]);

  if (!client || !formData) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center opacity-30">
        <User className="h-20 w-20 mb-4 stroke-1 text-[#8c6d45]" />
        <h3 className="font-serif text-2xl text-[#2a2421]">Nenhum cliente selecionado</h3>
        <p className="max-w-xs mt-3 text-sm font-medium uppercase tracking-[0.2em] text-[#8c6d45]">
          Selecione um cliente na lista ao lado para ver e editar seus detalhes.
        </p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // If the instagram handle changes, we clear the saved photo 
    // to allow the dynamic unavatar to show the new profile 
    const updated = { 
      ...formData, 
      [name]: value,
      ...(name === "instagram" ? { photo: undefined } : {})
    } as Client;
    
    setFormData(updated);
    onUpdate(updated);
  };

  const handleSyncPhoto = () => {
    if (!formData) return;
    const instagramPhotoUrl = `https://unavatar.io/instagram/${formData.instagram}`;
    const updated = { ...formData, photo: instagramPhotoUrl };
    setFormData(updated);
    onUpdate(updated);
  };

  const handleToggleTrust = () => {
    if (!formData) return;
    const updated = { ...formData, isTrusted: !formData.isTrusted };
    setFormData(updated);
    onUpdate(updated);
  };

  const clientPhotoUrl = formData.photo || `https://unavatar.io/instagram/${previewInstagram}`;
  const formattedPhoneForWhatsapp = formData.phone.replace(/\D/g, "");
  const openConditional = conditionals.find((entry) => entry.clientId === formData.id && entry.status === "open");
  const openConditionalStatus = openConditional ? getConditionalDerivedStatus(openConditional) : null;
  const openConditionalValue = openConditional ? getConditionalValue(openConditional) : 0;

  return (
    <div className="flex h-full flex-col bg-transparent custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-700 relative">
      
      {/* Profile Header - More Compact & Higher Up */}
      <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between px-8 pt-8 md:px-12 md:pt-10 border-b border-[#b08d57]/10 pb-8 bg-white/60 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group overflow-visible select-none">
            <div className="relative h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-[2.2rem] border-4 border-white shadow-2xl rotate-2 transition-transform hover:rotate-0 duration-500">
              <img
                src={clientPhotoUrl}
                className="h-full w-full object-cover scale-110"
                alt={formData.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=f7f2ed&color=8c6d45&size=512`;
                }}
              />
            </div>
            {/* Sync Overlay Button */}
            <button 
              onClick={handleSyncPhoto}
              title="Sincronizar Foto do Instagram"
              className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-white border-2 border-[#b08d57]/20 flex items-center justify-center text-[#8c6d45] hover:bg-[#8c6d45] hover:text-white transition-all shadow-lg z-10 group/sync"
            >
              <Check className={`h-4 w-4 transition-transform ${formData.photo ? 'scale-110' : 'scale-0'}`} />
              {!formData.photo && <Camera className="absolute h-4 w-4 transition-transform group-hover/sync:scale-110" />}
            </button>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left pt-2">
            <h2 className="font-serif text-3xl md:text-5xl text-[#2a2421] tracking-tight mb-2">{formData.name}</h2>
            
            {/* Social Buttons - Compact beneath the name */}
            <div className="flex items-center gap-3">
              <a 
                href={`https://wa.me/${formattedPhoneForWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ecfdf5] border border-[#10b981]/20 text-[#065f46] hover:bg-[#10b981] hover:text-white transition-all text-[11px] font-black uppercase tracking-wider shadow-sm group"
              >
                <MessageCircle className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                WhatsApp
              </a>
              <a 
                href={`https://instagram.com/${formData.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fff1f2] border border-[#f43f5e]/20 text-[#9f1239] hover:bg-[#f43f5e] hover:text-white transition-all text-[11px] font-black uppercase tracking-wider shadow-sm group"
              >
                <Camera className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                Instagram
              </a>
              <Link 
                href={`/listas/novo?clienteId=${formData.id}`}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fdfaf7] border border-[#b08d57]/20 text-[#8c6d45] hover:bg-[#8c6d45] hover:text-white transition-all text-[11px] font-black uppercase tracking-wider shadow-sm group"
              >
                <Gift className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                Criar lista de presentes
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-[9px] font-black uppercase tracking-widest">Premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden md:flex gap-4 self-start">
          <button
            onClick={() => {
              void onDelete(formData);
            }}
            disabled={isDeleting}
            className="rounded-full border border-red-200 bg-red-50 px-10 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? "Excluindo" : "Excluir"}
          </button>
          <button
            onClick={() => {
              void onSave(formData);
            }}
            disabled={isSaving}
            className="rounded-full bg-[#8c6d45] px-10 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#8c6d45]/20 transition-all hover:bg-[#725a38] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Salvando" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Main Registration Data */}
          <section className="space-y-8 rounded-[2.75rem] border border-white/70 bg-[rgba(253,251,247,0.58)] p-6 shadow-[0_20px_50px_rgba(176,141,87,0.12)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000 md:p-8">
            <div className="flex items-center justify-between border-b-2 border-[#b08d57]/15 pb-4">
              <h3 className="font-serif text-2xl text-[#2a2421]">Dados Cadastrais</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8c6d45]">ID: {formData.id}</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <FormField
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                icon={<User className="h-5 w-5" />}
              />
              <FormField
                label="CPF / Documento"
                name="cpf"
                value={formData.cpf || ""}
                onChange={handleChange}
                placeholder="000.000.000-00"
                icon={<CreditCard className="h-5 w-5" />}
              />
              <FormField
                label="Telefone Celular"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                icon={<Phone className="h-5 w-5" />}
              />
              <FormField
                label="E-mail"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="cliente@exemplo.com"
                type="email"
                icon={<Mail className="h-5 w-5" />}
              />
              <FormField
                label="Perfil do Instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="usuário (sem @)"
                icon={<Camera className="h-5 w-5" />}
              />
            </div>

            {/* Address Field - Full Width */}
            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-[0.25em] font-extrabold text-[#5c4a33] ml-1">Endereço Completo</label>
              <div className="relative group">
                <div className="pointer-events-none absolute left-4 top-5 z-10 text-[#8c6d45] group-focus-within:text-[#2a2421] transition-colors">
                  <MapPin className="h-5 w-5" />
                </div>
                <textarea
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-2xl border-2 border-[#b08d57]/25 bg-[rgba(253,251,247,0.86)] backdrop-blur-[2px] py-4 pl-12 pr-4 text-base font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-8 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
                  placeholder="Rua, número, bairro, cidade - UF"
                ></textarea>
              </div>
            </div>
          </section>

          {/* Conditional / Credit Section */}
          <section className="space-y-8 pt-6 border-t-2 border-[#b08d57]/15 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-[#2a2421]">Venda Condicional & Prazo</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleTrust}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                    formData.isTrusted 
                      ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200" 
                      : "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                  }`}
                >
                  {formData.isTrusted ? "Liberado" : "Bloqueado"}
                </button>
              </div>
            </div>
            
            <div className={`p-10 rounded-[2.5rem] border-2 border-dashed text-center transition-all ${
              formData.isTrusted 
                ? "bg-[#f7f2ed]/50 border-[#b08d57]/10" 
                : "bg-red-50/30 border-red-200/50"
            }`}>
              <CreditCard className={`h-10 w-10 mx-auto mb-4 opacity-40 ${formData.isTrusted ? "text-[#8c6d45]" : "text-red-500"}`} />
              <p className={`text-sm font-medium uppercase tracking-[0.1em] leading-relaxed ${formData.isTrusted ? "text-[#8c6d45]" : "text-red-700"}`}>
                {formData.isTrusted ? (
                  <>
                    Este cliente possui limite aprovado para <span className="font-black text-[#5c4a33]">Condicional</span>.<br/>
                    Histórico de itens em aberto será exibido aqui.
                  </>
                ) : (
                  <>
                    Este cliente está <span className="font-black text-red-800">Bloqueado</span> para vendas condicionais.<br/>
                    A liberação deve ser feita manualmente pela gerência.
                  </>
                )}
              </p>

              {formData.isTrusted ? (
                <div className="mt-8 space-y-4">
                  {openConditional ? (
                    <div className="rounded-[2rem] border border-[#b08d57]/15 bg-white/80 p-5 text-left shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8c6d45]">
                            Condicional em aberto
                          </p>
                          <p className="mt-1 font-serif text-2xl text-[#2a2421]">
                            {openConditional.items.reduce((sum, item) => sum + item.qtySent, 0)} itens
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                          openConditionalStatus === "late"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : openConditionalStatus === "due_today"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-[#f7f2ed] text-[#8c6d45] border border-[#b08d57]/20"
                        }`}>
                          {openConditionalStatus === "late"
                            ? "Atrasado"
                            : openConditionalStatus === "due_today"
                              ? "Vence hoje"
                              : "Em aberto"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c6d45]">
                        <span>Devolução: {new Date(`${openConditional.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                        <span>Valor enviado: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(openConditionalValue)}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/condicionais?clientId=${formData.id}${openConditional ? "" : "&action=new"}`}
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                        formData.isTrusted
                          ? "bg-[#8c6d45] text-white shadow-lg shadow-[#8c6d45]/20 hover:bg-[#725a38]"
                          : "pointer-events-none bg-[#f3ece5] text-[#c9bfb5]"
                      }`}
                    >
                      <ClipboardList className="h-4 w-4" />
                      {openConditional ? "Ver condicional" : "Abrir condicional"}
                    </Link>

                    {openConditional ? (
                      <Link
                        href="/caixa"
                        className="inline-flex items-center gap-2 rounded-full border border-[#b08d57]/20 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#5c4a33] hover:bg-[#f7f2ed] transition-all"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Ir para o caixa
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {/* Fixed Bottom Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-[#b08d57]/20 flex gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => {
            void onDelete(formData);
          }}
          disabled={isDeleting}
          className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-xs font-black uppercase tracking-widest text-red-700 transition-all active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? "Excluindo" : "Excluir"}
        </button>
        <button
          onClick={() => {
            void onSave(formData);
          }}
          disabled={isSaving}
          className="flex-[2] rounded-2xl bg-[#8c6d45] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#8c6d45]/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Salvando" : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, name, value, onChange, icon, placeholder = "", type = "text" }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: ReactElement; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] uppercase tracking-[0.25em] font-black text-[#2a2421] ml-1">{label}</label>
      <div className="relative group">
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#8c6d45] group-focus-within:text-[#2a2421] transition-colors">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border-2 border-[#b08d57]/25 bg-[rgba(253,251,247,0.86)] backdrop-blur-[2px] py-4 pl-12 pr-4 text-base font-medium text-[#2a2421] placeholder-[#a69b8f] focus:border-[#8c6d45] focus:outline-none focus:ring-8 focus:ring-[#8c6d45]/5 transition-all shadow-sm"
        />
      </div>
    </div>
  );
}
