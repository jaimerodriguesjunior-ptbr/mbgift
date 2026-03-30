import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ConditionalItem, ConditionalRecord, ConditionalStatus } from "@/types";

type ConditionalRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  status: ConditionalStatus;
  opened_at: string;
  due_date: string;
  receipt_printed_at: string | null;
  notes: string | null;
  sale_id: string | null;
};

type ConditionalItemRow = {
  id: string;
  tenant_id: string;
  conditional_id: string;
  product_id: string;
  qty_sent: number;
  qty_sold: number;
  qty_returned: number;
  unit_price: number | string;
};

type ConditionalInsertRow = {
  tenant_id: string;
  client_id: string;
  due_date: string;
  notes: string | null;
  status: "open";
};

type ConditionalItemInsertRow = {
  tenant_id: string;
  conditional_id: string;
  product_id: string;
  qty_sent: number;
  qty_sold: number;
  qty_returned: number;
  unit_price: number;
};

function mapConditionalItemRow(row: ConditionalItemRow): ConditionalItem {
  return {
    productId: row.product_id,
    qtySent: row.qty_sent,
    qtySold: row.qty_sold,
    qtyReturned: row.qty_returned,
    unitPrice: Number(row.unit_price)
  };
}

function mapConditionalRecord(row: ConditionalRow, items: ConditionalItem[]): ConditionalRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    clientId: row.client_id,
    status: row.status,
    openedAt: row.opened_at,
    dueDate: row.due_date,
    receiptPrintedAt: row.receipt_printed_at ?? undefined,
    notes: row.notes ?? undefined,
    saleId: row.sale_id ?? undefined,
    items
  };
}

async function loadConditionalItems(tenantId: string, conditionalIds: string[]) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditional_items")
    .select("id, tenant_id, conditional_id, product_id, qty_sent, qty_sold, qty_returned, unit_price")
    .eq("tenant_id", tenantId)
    .in("conditional_id", conditionalIds);

  if (error) {
    throw new Error(`Falha ao carregar itens de condicional: ${error.message}`);
  }

  return (data ?? []) as ConditionalItemRow[];
}

export async function listConditionalsByTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditionals")
    .select("id, tenant_id, client_id, status, opened_at, due_date, receipt_printed_at, notes, sale_id")
    .eq("tenant_id", tenantId)
    .order("opened_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar condicionais: ${error.message}`);
  }

  const rows = (data ?? []) as ConditionalRow[];
  if (rows.length === 0) {
    return [];
  }

  const items = await loadConditionalItems(tenantId, rows.map((row) => row.id));

  return rows.map((row) =>
    mapConditionalRecord(
      row,
      items
        .filter((item) => item.conditional_id === row.id)
        .map((item) => mapConditionalItemRow(item))
    )
  );
}

export async function getConditionalById(tenantId: string, conditionalId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditionals")
    .select("id, tenant_id, client_id, status, opened_at, due_date, receipt_printed_at, notes, sale_id")
    .eq("tenant_id", tenantId)
    .eq("id", conditionalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar condicional: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const items = await loadConditionalItems(tenantId, [conditionalId]);
  return mapConditionalRecord(
    data as ConditionalRow,
    items.map((item) => mapConditionalItemRow(item))
  );
}

export async function getOpenConditionalByClientId(tenantId: string, clientId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditionals")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao verificar condicional aberto do cliente: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function getReservedQuantityForProduct(tenantId: string, productId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditional_items")
    .select("qty_sent, conditional:conditionals!inner(status)")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("conditionals.status", "open");

  if (error) {
    throw new Error(`Falha ao calcular reserva do produto: ${error.message}`);
  }

  return (data ?? []).reduce((total, row) => total + Number((row as { qty_sent: number }).qty_sent), 0);
}

export async function createConditionalRecord(
  tenantId: string,
  row: ConditionalInsertRow,
  items: ConditionalItemInsertRow[]
) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conditionals")
    .insert({ ...row, tenant_id: tenantId })
    .select("id, tenant_id, client_id, status, opened_at, due_date, receipt_printed_at, notes, sale_id")
    .single();

  if (error) {
    throw new Error(`Falha ao criar condicional: ${error.message}`);
  }

  const conditional = data as ConditionalRow;
  const itemRows = items.map((item) => ({ ...item, conditional_id: conditional.id, tenant_id: tenantId }));
  const { error: itemsError } = await supabase.from("conditional_items").insert(itemRows);

  if (itemsError) {
    throw new Error(`Falha ao criar itens do condicional: ${itemsError.message}`);
  }

  return getConditionalById(tenantId, conditional.id);
}

export async function markConditionalReceiptPrinted(tenantId: string, conditionalId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("conditionals")
    .update({ receipt_printed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", conditionalId);

  if (error) {
    throw new Error(`Falha ao marcar impressão do recibo: ${error.message}`);
  }
}

export async function finalizeConditionalAsReturned(tenantId: string, conditionalId: string) {
  const supabase = createSupabaseServerClient();
  const conditional = await getConditionalById(tenantId, conditionalId);

  if (!conditional) {
    return null;
  }

  const { error: statusError } = await supabase
    .from("conditionals")
    .update({ status: "returned_full" })
    .eq("tenant_id", tenantId)
    .eq("id", conditionalId);

  if (statusError) {
    throw new Error(`Falha ao fechar condicional como devolvido: ${statusError.message}`);
  }

  for (const item of conditional.items) {
    const { error: itemError } = await supabase
      .from("conditional_items")
      .update({
        qty_sold: 0,
        qty_returned: item.qtySent
      })
      .eq("tenant_id", tenantId)
      .eq("conditional_id", conditionalId)
      .eq("product_id", item.productId);

    if (itemError) {
      throw new Error(`Falha ao atualizar item devolvido do condicional: ${itemError.message}`);
    }
  }

  return getConditionalById(tenantId, conditionalId);
}

export async function finalizeConditionalAfterSale(
  tenantId: string,
  conditionalId: string,
  saleId: string,
  soldQuantities: Record<string, number>
) {
  const supabase = createSupabaseServerClient();
  const conditional = await getConditionalById(tenantId, conditionalId);

  if (!conditional) {
    return null;
  }

  let soldTotal = 0;
  let sentTotal = 0;

  for (const item of conditional.items) {
    const qtySold = Math.max(0, Math.min(item.qtySent, soldQuantities[item.productId] ?? 0));
    const qtyReturned = item.qtySent - qtySold;

    soldTotal += qtySold;
    sentTotal += item.qtySent;

    const { error: itemError } = await supabase
      .from("conditional_items")
      .update({
        qty_sold: qtySold,
        qty_returned: qtyReturned
      })
      .eq("tenant_id", tenantId)
      .eq("conditional_id", conditionalId)
      .eq("product_id", item.productId);

    if (itemError) {
      throw new Error(`Falha ao atualizar itens vendidos do condicional: ${itemError.message}`);
    }
  }

  const nextStatus: ConditionalStatus =
    soldTotal === sentTotal ? "converted_full" : soldTotal > 0 ? "converted_partial" : "returned_full";

  const { error: conditionalError } = await supabase
    .from("conditionals")
    .update({
      status: nextStatus,
      sale_id: saleId
    })
    .eq("tenant_id", tenantId)
    .eq("id", conditionalId);

  if (conditionalError) {
    throw new Error(`Falha ao finalizar condicional após venda: ${conditionalError.message}`);
  }

  return getConditionalById(tenantId, conditionalId);
}
