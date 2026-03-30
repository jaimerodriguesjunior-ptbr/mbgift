import type { SaleItemOrigin, SaleRecord, StorePaymentEntry } from "@/types";

export type SaleCreateInput = {
  total: number;
  payments: StorePaymentEntry[];
  clientId?: string;
  cpf?: string | null;
  items: Array<{
    productId: string;
    qty: number;
    giftListItemId?: string;
    sourceType?: SaleItemOrigin;
  }>;
  originType: "direct" | "conditional";
  originId?: string;
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
  source_type: SaleItemOrigin;
  gift_list_item_id: string | null;
};

type SalePaymentInsertRow = {
  tenant_id: string;
  sale_id: string;
  method: StorePaymentEntry["method"];
  amount: number;
};

export function buildSaleCreateInput(input: unknown): SaleCreateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de venda inválido.");
  }

  const source = input as Record<string, unknown>;
  const total = typeof source.total === "number" ? source.total : Number.NaN;

  if (!Number.isFinite(total) || total < 0) {
    throw new Error("Total da venda inválido.");
  }

  if (!Array.isArray(source.payments) || source.payments.length === 0) {
    throw new Error("Informe ao menos um pagamento.");
  }

  if (!Array.isArray(source.items) || source.items.length === 0) {
    throw new Error("Informe ao menos um item na venda.");
  }

  const payments = source.payments.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Pagamento inválido.");
    }

    const payment = entry as Record<string, unknown>;
    const method = payment.method;
    const amount = typeof payment.amount === "number" ? payment.amount : Number.NaN;

    if (!["credito", "debito", "pix", "dinheiro", "boleto"].includes(String(method))) {
      throw new Error("Método de pagamento inválido.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Valor de pagamento inválido.");
    }

    return { method: method as StorePaymentEntry["method"], amount };
  });

  const items = source.items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Item de venda inválido.");
    }

    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const qty = typeof item.qty === "number" ? item.qty : Number.NaN;

    if (!productId) {
      throw new Error('Todo item da venda precisa de "productId".');
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("Quantidade inválida na venda.");
    }

    const giftListItemId = typeof item.giftListItemId === "string" && item.giftListItemId.trim()
      ? item.giftListItemId.trim()
      : undefined;

    const sourceType: SaleItemOrigin = item.sourceType === "conditional" ? "conditional" : "direct";

    return { productId, qty, giftListItemId, sourceType };
  });

  const originType = source.originType === "conditional" ? "conditional" : "direct";
  const clientId = typeof source.clientId === "string" && source.clientId.trim() ? source.clientId.trim() : undefined;
  const cpf = typeof source.cpf === "string" && source.cpf.trim() ? source.cpf.trim() : null;
  const originId = typeof source.originId === "string" && source.originId.trim() ? source.originId.trim() : undefined;

  return {
    total,
    payments,
    clientId,
    cpf,
    items,
    originType,
    originId
  };
}

export function saleInputToInsertRow(
  tenantId: string,
  input: SaleCreateInput,
  clientName?: string
): SaleInsertRow {
  return {
    tenant_id: tenantId,
    client_id: input.clientId ?? null,
    client_name: clientName ?? null,
    cpf: input.cpf ?? null,
    origin_type: input.originType,
    origin_id: input.originId ?? null,
    total: input.total
  };
}

export function saleItemsToInsertRows(
  tenantId: string,
  saleId: string,
  items: Array<{ productId: string; qty: number; unitPrice: number; sourceType: SaleItemOrigin; giftListItemId?: string }>
): SaleItemInsertRow[] {
  return items.map((item) => ({
    tenant_id: tenantId,
    sale_id: saleId,
    product_id: item.productId,
    quantity: item.qty,
    unit_price: item.unitPrice,
    source_type: item.sourceType,
    gift_list_item_id: item.giftListItemId ?? null
  }));
}

export function salePaymentsToInsertRows(
  tenantId: string,
  saleId: string,
  payments: StorePaymentEntry[]
): SalePaymentInsertRow[] {
  return payments.map((payment) => ({
    tenant_id: tenantId,
    sale_id: saleId,
    method: payment.method,
    amount: payment.amount
  }));
}

export function saleResponse(sale: SaleRecord) {
  return sale;
}
