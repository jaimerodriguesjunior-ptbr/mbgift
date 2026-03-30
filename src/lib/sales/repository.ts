import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SaleItemRecord, SaleRecord, StorePaymentEntry } from "@/types";

type SaleRow = {
  id: string;
  tenant_id: string;
  total: number | string;
  client_id: string | null;
  client_name: string | null;
  cpf: string | null;
  origin_type: "direct" | "conditional";
  origin_id: string | null;
  canceled_at: string | null;
  sold_at: string;
};

type SalePaymentRow = {
  sale_id: string;
  method: StorePaymentEntry["method"];
  amount: number | string;
};

type SaleItemRow = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | string;
  source_type: "direct" | "conditional";
  gift_list_item_id: string | null;
};

type SaleInsertRow = {
  tenant_id: string;
  client_id: string | null;
  client_name: string | null;
  cpf: string | null;
  origin_type: "direct" | "conditional";
  origin_id: string | null;
  total: number;
};

type SaleItemInsertRow = {
  tenant_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  source_type: "direct" | "conditional";
  gift_list_item_id: string | null;
};

type SalePaymentInsertRow = {
  tenant_id: string;
  sale_id: string;
  method: StorePaymentEntry["method"];
  amount: number;
};

function formatTime(soldAt: string) {
  return new Date(soldAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mapSaleRow(row: SaleRow, payments: StorePaymentEntry[], items: SaleItemRecord[]): SaleRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    total: Number(row.total),
    payments,
    items,
    time: formatTime(row.sold_at),
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    cpf: row.cpf ?? undefined,
    originType: row.origin_type,
    originId: row.origin_id ?? undefined,
    canceledAt: row.canceled_at ?? undefined
  };
}

async function loadPaymentsForSales(tenantId: string, saleIds: string[]) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_payments")
    .select("sale_id, method, amount")
    .eq("tenant_id", tenantId)
    .in("sale_id", saleIds);

  if (error) {
    throw new Error(`Falha ao carregar pagamentos das vendas: ${error.message}`);
  }

  return (data ?? []) as SalePaymentRow[];
}

async function loadItemsForSales(tenantId: string, saleIds: string[]) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sale_items")
    .select("sale_id, product_id, quantity, unit_price, source_type, gift_list_item_id")
    .eq("tenant_id", tenantId)
    .in("sale_id", saleIds);

  if (error) {
    throw new Error(`Falha ao carregar itens das vendas: ${error.message}`);
  }

  return (data ?? []) as SaleItemRow[];
}

export async function listSalesByTenant(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, tenant_id, total, client_id, client_name, cpf, origin_type, origin_id, canceled_at, sold_at")
    .eq("tenant_id", tenantId)
    .order("sold_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar vendas: ${error.message}`);
  }

  const rows = (data ?? []) as SaleRow[];
  if (rows.length === 0) {
    return [];
  }

  const saleIds = rows.map((row) => row.id);
  const [payments, items] = await Promise.all([
    loadPaymentsForSales(tenantId, saleIds),
    loadItemsForSales(tenantId, saleIds)
  ]);

  return rows.map((row) =>
    mapSaleRow(
      row,
      payments
        .filter((payment) => payment.sale_id === row.id)
        .map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount)
        })),
      items
        .filter((item) => item.sale_id === row.id)
        .map((item) => ({
          productId: item.product_id,
          qty: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          sourceType: item.source_type === "conditional" ? "conditional" : "direct",
          giftListItemId: item.gift_list_item_id ?? undefined
        }))
    )
  );
}

export async function createSaleRecord(
  tenantId: string,
  row: SaleInsertRow,
  items: SaleItemInsertRow[],
  payments: SalePaymentInsertRow[]
) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .insert({ ...row, tenant_id: tenantId })
    .select("id, tenant_id, total, client_id, client_name, cpf, origin_type, origin_id, canceled_at, sold_at")
    .single();

  if (error) {
    throw new Error(`Falha ao criar venda: ${error.message}`);
  }

  const sale = data as SaleRow;

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(items.map((item) => ({ ...item, sale_id: sale.id, tenant_id: tenantId })));

    if (itemsError) {
      throw new Error(`Falha ao criar itens da venda: ${itemsError.message}`);
    }
  }

  if (payments.length > 0) {
    const { error: paymentsError } = await supabase
      .from("sale_payments")
      .insert(payments.map((payment) => ({ ...payment, sale_id: sale.id, tenant_id: tenantId })));

    if (paymentsError) {
      throw new Error(`Falha ao criar pagamentos da venda: ${paymentsError.message}`);
    }
  }

  return mapSaleRow(
    sale,
    payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount
    })),
    items.map((item) => ({
      productId: item.product_id,
      qty: item.quantity,
      unitPrice: item.unit_price,
      sourceType: item.source_type === "conditional" ? "conditional" : "direct",
      giftListItemId: item.gift_list_item_id ?? undefined
    }))
  );
}

export async function decrementProductStock(tenantId: string, productId: string, quantity: number) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .single();

  if (error) {
    throw new Error(`Falha ao carregar estoque do produto: ${error.message}`);
  }

  const nextStock = Math.max(0, Number((data as { stock_quantity: number }).stock_quantity) - quantity);
  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: nextStock })
    .eq("tenant_id", tenantId)
    .eq("id", productId);

  if (updateError) {
    throw new Error(`Falha ao baixar estoque do produto: ${updateError.message}`);
  }
}

export async function cancelSaleRecord(tenantId: string, saleId: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase.rpc("cancel_sale_and_restore", {
    target_tenant_id: tenantId,
    target_sale_id: saleId
  });

  if (error) {
    throw new Error(`Falha ao cancelar venda: ${error.message}`);
  }

  return data as SaleRow | null;
}
