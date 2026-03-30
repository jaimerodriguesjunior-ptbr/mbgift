"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, MapPin, ShieldCheck, Save } from "lucide-react";
import Link from "next/link";

import { fetchCurrentTenantSettings, updateCurrentTenantSettings } from "@/lib/painel-api";

type FormState = {
  businessName: string;
  displayName: string;
  logoUrl: string | null;
  documentCnpj: string;
  stateRegistration: string;
  municipalRegistration: string;
  taxRegime: string;
  addressZipCode: string;
  addressLine1: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressIbgeCode: string;
};

function splitAddressLine2(value: string | null | undefined) {
  if (!value) {
    return { addressNumber: "", addressComplement: "" };
  }

  const [addressNumber = "", addressComplement = ""] = value.split("|").map((part) => part.trim());
  return { addressNumber, addressComplement };
}

function buildFormState() {
  return {
    businessName: "",
    displayName: "",
    logoUrl: null,
    documentCnpj: "",
    stateRegistration: "",
    municipalRegistration: "",
    taxRegime: "Simples Nacional",
    addressZipCode: "",
    addressLine1: "",
    addressNumber: "",
    addressComplement: "",
    addressDistrict: "",
    addressCity: "",
    addressState: "",
    addressIbgeCode: ""
  } satisfies FormState;
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("empresa");
  const [formData, setFormData] = useState<FormState>(buildFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTenantSettings() {
      try {
        const tenant = await fetchCurrentTenantSettings();
        if (!isMounted || !tenant) {
          return;
        }

        const addressLine2 = splitAddressLine2(tenant.addressLine2);
        setFormData({
          businessName: tenant.businessName ?? "",
          displayName: tenant.displayName ?? "",
          logoUrl: tenant.logoUrl ?? null,
          documentCnpj: tenant.documentCnpj ?? "",
          stateRegistration: tenant.stateRegistration ?? "",
          municipalRegistration: tenant.municipalRegistration ?? "",
          taxRegime: tenant.taxRegime ?? "Simples Nacional",
          addressZipCode: tenant.addressZipCode ?? "",
          addressLine1: tenant.addressLine1 ?? "",
          addressNumber: addressLine2.addressNumber,
          addressComplement: addressLine2.addressComplement,
          addressDistrict: tenant.addressDistrict ?? "",
          addressCity: tenant.addressCity ?? "",
          addressState: tenant.addressState ?? "",
          addressIbgeCode: ""
        });
      } catch (error) {
        if (isMounted) {
          setFeedback(error instanceof Error ? error.message : "Falha ao carregar configurações.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTenantSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const inputClass = "w-full rounded-xl border-2 border-[#b08d57]/25 bg-white px-4 py-2.5 text-sm font-bold text-[#2a2421] shadow-sm focus:outline-none focus:border-[#8c6d45] focus:ring-1 focus:ring-[#8c6d45]/20 transition-all placeholder:text-[#a69b8f]/40";
  const selectClass = "w-full appearance-none rounded-xl border-2 border-[#b08d57]/25 bg-white px-4 py-2.5 text-sm font-bold text-[#2a2421] shadow-sm focus:outline-none focus:border-[#8c6d45] transition-all cursor-pointer";
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-[#5c4a33] ml-1 mb-1.5 block";

  const headerFeedback = useMemo(() => {
    if (isSaving) {
      return "Salvando...";
    }

    if (isLoading) {
      return "Carregando dados da loja...";
    }

    return feedback;
  }, [feedback, isLoading, isSaving]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
    setFeedback(null);
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      setFeedback(null);

      await updateCurrentTenantSettings({
        businessName: formData.businessName,
        displayName: formData.displayName,
        logoUrl: formData.logoUrl,
        documentCnpj: formData.documentCnpj || null,
        stateRegistration: formData.stateRegistration || null,
        municipalRegistration: formData.municipalRegistration || null,
        taxRegime: formData.taxRegime || null,
        addressZipCode: formData.addressZipCode || null,
        addressLine1: formData.addressLine1 || null,
        addressLine2: [formData.addressNumber, formData.addressComplement].filter(Boolean).join(" | ") || null,
        addressDistrict: formData.addressDistrict || null,
        addressCity: formData.addressCity || null,
        addressState: formData.addressState || null
      });

      setFeedback("Configurações salvas com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="h-screen bg-[#faf8f5] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#b08d57]/10 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="h-9 w-9 flex items-center justify-center rounded-full border border-[#b08d57]/20 text-[#8c6d45] hover:bg-[#f7f2ed] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-serif text-xl text-[#2a2421] leading-none">Configurações</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a69b8f] mt-1">Dados da Loja e Fiscal</p>
            {headerFeedback ? (
              <p className="text-[10px] mt-2 text-[#8c6d45] font-bold">{headerFeedback}</p>
            ) : null}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-[#8c6d45] text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#725a38] transition-all shadow-lg shadow-[#8c6d45]/20 active:scale-95 transition-transform disabled:opacity-60 disabled:hover:bg-[#8c6d45]"
        >
          <Save className="h-3.5 w-3.5" />
          Salvar
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-r border-[#b08d57]/10 p-6 overflow-y-auto">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("empresa")}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all text-left ${
                activeTab === "empresa"
                  ? "bg-[#8c6d45] text-white shadow-lg shadow-[#8c6d45]/20"
                  : "bg-white text-[#5c4a33] border border-[#b08d57]/10 hover:border-[#b08d57]/30 hover:bg-[#f7f2ed]"
              }`}
            >
              <Building2 className={`h-3.5 w-3.5 ${activeTab === "empresa" ? "text-white" : "text-[#b08d57]"}`} />
              Empresa
            </button>
            <div className="px-5 py-3 opacity-30 cursor-not-allowed">
              <p className="text-[9px] font-bold text-[#a69b8f] uppercase tracking-widest">Em breve</p>
            </div>
          </nav>
        </aside>

        <div className="flex-1 bg-[#faf8f5] overflow-y-auto">
          <div className="max-w-6xl p-8 md:p-10 space-y-10 pb-32 animate-in fade-in slide-in-from-right-2 duration-500">
            {activeTab === "empresa" && (
              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-[#b08d57]/20">
                    <Building2 className="h-5 w-5 text-[#8c6d45]" />
                    <h2 className="font-serif text-lg text-[#2a2421]">Identificação Fiscal & Identidade Virtual</h2>
                  </div>

                  <div className="mb-8 flex items-end gap-6">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-[#b08d57]/30 bg-white">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} className="h-full w-full object-contain p-2" alt="Logo da loja" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-[#8c6d45]/50">
                          <Building2 className="h-6 w-6 mb-1" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Sem Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c6d45]">Logotipo da Loja</p>
                       <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#b08d57]/20 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5c4a33] transition-all hover:bg-[#f7f2ed] shadow-sm">
                         <span>Anexar Imagem</span>
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={async (event) => {
                             const file = event.target.files?.[0];
                             if (!file) return;
                             try {
                               setIsSaving(true);
                               const payload = new FormData();
                               payload.append("file", file);
                               const res = await fetch("/api/uploads/tenant-assets", { method: "POST", body: payload });
                               if (!res.ok) throw new Error("Falha no upload");
                               const data = await res.json();
                               setFormData((current) => ({ ...current, logoUrl: data.publicUrl }));
                               setFeedback("Logotipo carregado, clique em Salvar para manter.");
                             } catch (err) {
                               setFeedback("Falha ao subir imagem. Tente novamente.");
                             } finally {
                               setIsSaving(false);
                             }
                           }}
                         />
                       </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-5">
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>Razão Social</label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="Ex: Minha Loja Presentes Ltda." className={inputClass} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>Nome Fantasia</label>
                      <input type="text" name="displayName" value={formData.displayName} onChange={handleInputChange} placeholder="Nome exibido para os clientes" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>CNPJ</label>
                      <input type="text" name="documentCnpj" value={formData.documentCnpj} onChange={handleInputChange} placeholder="00.000.000/0000-00" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>Inscrição Estadual</label>
                      <input type="text" name="stateRegistration" value={formData.stateRegistration} onChange={handleInputChange} placeholder="Número da inscrição" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>Inscrição Municipal</label>
                      <input type="text" name="municipalRegistration" value={formData.municipalRegistration} onChange={handleInputChange} placeholder="Número da inscrição" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>Regime Tributário</label>
                      <select name="taxRegime" value={formData.taxRegime} onChange={handleInputChange} className={selectClass}>
                        <option>Simples Nacional</option>
                        <option>Lucro Presumido</option>
                        <option>Lucro Real</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-[#b08d57]/20">
                    <MapPin className="h-5 w-5 text-[#8c6d45]" />
                    <h2 className="font-serif text-lg text-[#2a2421]">Loja (Endereço)</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-x-6 gap-y-5">
                    <div className="md:col-span-2 space-y-1">
                      <label className={labelClass}>CEP</label>
                      <input type="text" name="addressZipCode" value={formData.addressZipCode} onChange={handleInputChange} placeholder="00000-000" className={inputClass} />
                    </div>
                    <div className="md:col-span-4 lg:col-span-6 space-y-1">
                      <label className={labelClass}>Logradouro</label>
                      <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} placeholder="Rua / Avenida / Alameda" className={inputClass} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2 space-y-1">
                      <label className={labelClass}>Número</label>
                      <input type="text" name="addressNumber" value={formData.addressNumber} onChange={handleInputChange} placeholder="N\u00fam." className={inputClass} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2 space-y-1">
                      <label className={labelClass}>Comp.</label>
                      <input type="text" name="addressComplement" value={formData.addressComplement} onChange={handleInputChange} placeholder="Apto/Loja" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 lg:col-span-4 space-y-1">
                      <label className={labelClass}>Bairro</label>
                      <input type="text" name="addressDistrict" value={formData.addressDistrict} onChange={handleInputChange} placeholder="Nome do Bairro" className={inputClass} />
                    </div>
                    <div className="md:col-span-3 lg:col-span-5 space-y-1">
                      <label className={labelClass}>Cidade</label>
                      <input type="text" name="addressCity" value={formData.addressCity} onChange={handleInputChange} placeholder="Nome da Cidade" className={inputClass} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1 space-y-1">
                      <label className={labelClass}>UF</label>
                      <input type="text" name="addressState" value={formData.addressState} onChange={handleInputChange} placeholder="UF" className={inputClass} />
                    </div>
                    <div className="md:col-span-2 lg:col-span-2 space-y-1">
                      <label className={labelClass}>Cód. IBGE</label>
                      <input type="text" name="addressIbgeCode" value={formData.addressIbgeCode} onChange={handleInputChange} placeholder="Município" className={inputClass} />
                    </div>
                  </div>
                </section>

                <section className="pb-20">
                  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-red-600/30">
                    <ShieldCheck className="h-5 w-5 text-red-600" />
                    <h2 className="font-serif text-lg text-[#2a2421]">Fiscal NFC-e</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="md:col-span-2 grid grid-cols-2 gap-x-6 gap-y-4 p-5 rounded-2xl bg-white border-2 border-amber-200/50 shadow-sm transition-all focus-within:border-amber-400">
                      <div className="col-span-2 flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#8c6d45]">Ambiente de Homologação (Testes)</p>
                      </div>
                      <div className="space-y-1 text-left">
                        <label className={labelClass}>CSC Token</label>
                        <input type="password" value="••••••••••••••••" readOnly className={inputClass} />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className={labelClass}>CSC ID</label>
                        <input type="text" placeholder="ID" className={inputClass} />
                      </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-x-6 gap-y-4 p-5 rounded-2xl bg-white border-2 border-red-200/50 shadow-sm transition-all focus-within:border-red-400">
                      <div className="col-span-2 flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-red-600" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Ambiente de Produção (Real)</p>
                      </div>
                      <div className="space-y-1 text-left">
                        <label className={labelClass}>CSC Token</label>
                        <input type="password" placeholder="Token de Produção" className={inputClass} />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className={labelClass}>CSC ID</label>
                        <input type="text" placeholder="ID" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
