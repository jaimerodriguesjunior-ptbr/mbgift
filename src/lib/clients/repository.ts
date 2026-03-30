import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client } from "@/types";

type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  photo_url: string | null;
  cpf: string | null;
  address_text: string | null;
  is_trusted: boolean;
};

type ClientInsertRow = {
  tenant_id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  photo_url: string | null;
  cpf: string | null;
  address_text: string | null;
  is_trusted: boolean;
};

type ClientUpdateRow = Partial<Omit<ClientInsertRow, "tenant_id">>;

type ClientUsageCounts = {
  sales: number;
  conditionals: number;
  totalReferences: number;
  hasReferences: boolean;
};

function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    phone: row.phone ?? "",
    instagram: row.instagram ?? "",
    photo: row.photo_url ?? undefined,
    cpf: row.cpf ?? undefined,
    address: row.address_text ?? undefined,
    isTrusted: row.is_trusted
  };
}

const CLIENT_COLUMNS = `
  id,
  tenant_id,
  name,
  phone,
  instagram,
  photo_url,
  cpf,
  address_text,
  is_trusted
`;

export async function listClientsByTenant(tenantId: string, query?: string) {
  const supabase = createSupabaseServerClient();
  let request = supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    request = request.or(
      `name.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%,instagram.ilike.%${normalizedQuery}%,cpf.ilike.%${normalizedQuery}%`
    );
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Falha ao listar clientes: ${error.message}`);
  }

  return (data ?? []).map((entry) => mapClientRow(entry as ClientRow));
}

export async function getClientById(tenantId: string, clientId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar cliente: ${error.message}`);
  }

  return data ? mapClientRow(data as ClientRow) : null;
}

export async function createClient(tenantId: string, values: ClientInsertRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, tenant_id: tenantId })
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Falha ao criar cliente: ${error.message}`);
  }

  return mapClientRow(data as ClientRow);
}

export async function updateClient(tenantId: string, clientId: string, values: ClientUpdateRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", clientId)
    .select(CLIENT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar cliente: ${error.message}`);
  }

  return data ? mapClientRow(data as ClientRow) : null;
}

export async function getClientUsageCounts(tenantId: string, clientId: string): Promise<ClientUsageCounts> {
  const supabase = createSupabaseServerClient();

  const [{ count: salesCount, error: salesError }, { count: conditionalsCount, error: conditionalsError }] = await Promise.all([
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("client_id", clientId),
    supabase
      .from("conditionals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("client_id", clientId)
  ]);

  if (salesError) {
    throw new Error(`Falha ao contar vendas do cliente: ${salesError.message}`);
  }

  if (conditionalsError) {
    throw new Error(`Falha ao contar condicionais do cliente: ${conditionalsError.message}`);
  }

  const sales = salesCount ?? 0;
  const conditionals = conditionalsCount ?? 0;
  const totalReferences = sales + conditionals;

  return {
    sales,
    conditionals,
    totalReferences,
    hasReferences: totalReferences > 0
  };
}

export async function deleteClient(tenantId: string, clientId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", clientId);

  if (error) {
    throw new Error(`Falha ao excluir cliente: ${error.message}`);
  }
}
