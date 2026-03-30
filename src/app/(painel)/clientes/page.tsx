"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { Client, ConditionalRecord } from "@/types";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerDetail } from "@/components/customers/CustomerDetail";
import { createClient, deleteClient, fetchClients, fetchConditionals, fetchCurrentTenantSettings, updateClient } from "@/lib/painel-api";

function isDraftClientId(clientId: string) {
  return clientId.startsWith("draft-");
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [conditionals, setConditionals] = useState<ConditionalRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storeLabel, setStoreLabel] = useState("MBGifts");
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveRequestVersionRef = useRef<Record<string, number>>({});

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const [clientsPayload, conditionalsPayload, tenant] = await Promise.all([
          fetchClients(),
          fetchConditionals().catch(() => []),
          fetchCurrentTenantSettings().catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setClients(clientsPayload);
        setConditionals(conditionalsPayload);
        setStoreLabel(tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts");
      } catch (error) {
        if (isMounted) {
          setFeedback(error instanceof Error ? error.message : "Falha ao carregar clientes.");
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  function handleCreateClient() {
    setFeedback(null);

    const draftClient: Client = {
      id: `draft-${crypto.randomUUID()}`,
      name: "Novo Cliente",
      phone: "",
      email: "",
      instagram: "",
      cpf: "",
      address: "",
      isTrusted: true
    };

    setClients((current) => [draftClient, ...current]);
    setSelectedClientId(draftClient.id);
  }

  function handleUpdateClient(updatedClient: Client) {
    setClients((current) => current.map((client) => (client.id === updatedClient.id ? updatedClient : client)));
    setSelectedClientId(updatedClient.id);
    setFeedback(null);

    if (isDraftClientId(updatedClient.id)) {
      return;
    }

    const currentTimer = saveTimersRef.current[updatedClient.id];
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const nextVersion = (saveRequestVersionRef.current[updatedClient.id] ?? 0) + 1;
    saveRequestVersionRef.current[updatedClient.id] = nextVersion;

    saveTimersRef.current[updatedClient.id] = setTimeout(async () => {
      try {
        const persisted = await updateClient(updatedClient.id, updatedClient);

        if (saveRequestVersionRef.current[updatedClient.id] !== nextVersion) {
          return;
        }

        setClients((current) => current.map((client) => (client.id === persisted.id ? persisted : client)));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao salvar cliente.");
      }
    }, 300);
  }

  async function handleSaveClient(clientToSave: Client) {
    setFeedback(null);
    setSavingClientId(clientToSave.id);

    try {
      if (isDraftClientId(clientToSave.id)) {
        const created = await createClient({
          name: clientToSave.name,
          phone: clientToSave.phone,
          email: clientToSave.email,
          instagram: clientToSave.instagram,
          cpf: clientToSave.cpf,
          address: clientToSave.address,
          photo: clientToSave.photo,
          isTrusted: clientToSave.isTrusted
        });

        setClients((current) => current.map((client) => (
          client.id === clientToSave.id ? created : client
        )));
        setSelectedClientId(created.id);
        setFeedback("Cliente criado com sucesso.");
        return;
      }

      const currentTimer = saveTimersRef.current[clientToSave.id];
      if (currentTimer) {
        clearTimeout(currentTimer);
        delete saveTimersRef.current[clientToSave.id];
      }

      const nextVersion = (saveRequestVersionRef.current[clientToSave.id] ?? 0) + 1;
      saveRequestVersionRef.current[clientToSave.id] = nextVersion;

      const persisted = await updateClient(clientToSave.id, clientToSave);

      if (saveRequestVersionRef.current[clientToSave.id] !== nextVersion) {
        return;
      }

      setClients((current) => current.map((client) => (
        client.id === persisted.id ? persisted : client
      )));
      setSelectedClientId(persisted.id);
      setFeedback("Cliente salvo com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    } finally {
      setSavingClientId(null);
    }
  }

  async function handleDeleteClient(clientToDelete: Client) {
    const isDraft = isDraftClientId(clientToDelete.id);
    const confirmationMessage = isDraft
      ? "Descartar este novo cliente?"
      : `Excluir o cliente "${clientToDelete.name}"?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setFeedback(null);
    setDeletingClientId(clientToDelete.id);

    try {
      if (isDraft) {
        setClients((current) => current.filter((client) => client.id !== clientToDelete.id));
        setSelectedClientId(null);
        return;
      }

      await deleteClient(clientToDelete.id);
      setClients((current) => current.filter((client) => client.id !== clientToDelete.id));
      setSelectedClientId((current) => (current === clientToDelete.id ? null : current));
      setFeedback("Cliente excluído com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao excluir cliente.");
    } finally {
      setDeletingClientId(null);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex h-20 flex-shrink-0 items-center justify-between border-b-2 border-[#b08d57]/20 bg-white/65 backdrop-blur-md px-8 z-30 shadow-sm relative">
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
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6d45] font-extrabold">Gestão de Clientes</p>
          {feedback ? <p className="text-[10px] mt-2 text-[#8c6d45] font-bold">{feedback}</p> : null}
        </div>

        <button
          onClick={handleCreateClient}
          className="flex items-center gap-2 rounded-full border-2 border-[#b08d57]/20 bg-white px-4 md:px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[#5c4a33] hover:bg-[#f7f2ed] transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden md:inline">Novo Cliente</span>
          <span className="md:hidden">Novo</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`w-full md:w-80 lg:w-96 flex-shrink-0 z-20 overflow-hidden border-r-2 border-[#b08d57]/10 bg-[#faf8f5]/55 backdrop-blur-md transition-all duration-300 ${selectedClient ? "hidden md:block" : "block"}`}>
          <CustomerList
            clients={clients}
            selectedClientId={selectedClient?.id}
            onSelectClient={(client) => setSelectedClientId(client.id)}
          />
        </aside>

        <main className={`flex-1 overflow-hidden relative z-10 bg-transparent transition-all duration-300 ${selectedClient ? "block" : "hidden md:block"}`}>
          {selectedClient ? (
            <div className="h-full flex flex-col">
              <div className="md:hidden p-4 bg-white border-b border-[#b08d57]/10 flex items-center justify-between">
                <button
                  onClick={() => setSelectedClientId(null)}
                  className="flex items-center gap-2 text-[#8c6d45] font-bold text-xs uppercase tracking-widest"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Lista
                </button>
                <div className="text-[10px] font-black text-[#5c4a33] uppercase">Perfil do Cliente</div>
              </div>
              <div className="flex-1 overflow-hidden">
                <CustomerDetail
                  client={selectedClient}
                  onUpdate={handleUpdateClient}
                  onSave={handleSaveClient}
                  isSaving={savingClientId === selectedClient.id}
                  onDelete={handleDeleteClient}
                  isDeleting={deletingClientId === selectedClient.id}
                  conditionals={conditionals}
                />
              </div>
            </div>
          ) : (
            <div className="hidden md:flex h-full flex-col items-center justify-center text-center p-12 opacity-50">
              <CustomerDetail client={null} onUpdate={() => {}} onSave={async () => {}} isSaving={false} onDelete={async () => {}} isDeleting={false} conditionals={conditionals} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
