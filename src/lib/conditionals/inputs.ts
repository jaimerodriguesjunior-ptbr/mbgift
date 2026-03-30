import type { CheckoutDraft, ConditionalItem, ConditionalRecord } from "@/types";

export type ConditionalCreateInput = {
  clientId: string;
  dueDate: string;
  notes?: string | null;
  items: Array<{
    productId: string;
    qtySent: number;
  }>;
};

export type ConditionalReviewInput = {
  soldQuantities: Record<string, number>;
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

export function buildConditionalCreateInput(input: unknown): ConditionalCreateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de condicional inválido.");
  }

  const source = input as Record<string, unknown>;
  const clientId = typeof source.clientId === "string" ? source.clientId.trim() : "";
  const dueDate = typeof source.dueDate === "string" ? source.dueDate.trim() : "";
  const notes =
    source.notes === undefined || source.notes === null
      ? undefined
      : typeof source.notes === "string"
        ? source.notes.trim() || null
        : null;

  if (!clientId) {
    throw new Error('O campo "clientId" é obrigatório.');
  }

  if (!dueDate) {
    throw new Error('O campo "dueDate" é obrigatório.');
  }

  if (!Array.isArray(source.items) || source.items.length === 0) {
    throw new Error("Adicione ao menos um item ao condicional.");
  }

  const items = source.items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Item de condicional inválido.");
    }

    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const qtySent = typeof item.qtySent === "number" ? item.qtySent : Number.NaN;

    if (!productId) {
      throw new Error('Todo item do condicional precisa de "productId".');
    }

    if (!Number.isInteger(qtySent) || qtySent <= 0) {
      throw new Error("Quantidade inválida no condicional.");
    }

    return { productId, qtySent };
  });

  return {
    clientId,
    dueDate,
    notes,
    items
  };
}

export function buildConditionalReviewInput(input: unknown): ConditionalReviewInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de revisão de condicional inválido.");
  }

  const source = input as Record<string, unknown>;
  const soldQuantitiesSource = source.soldQuantities;

  if (!soldQuantitiesSource || typeof soldQuantitiesSource !== "object" || Array.isArray(soldQuantitiesSource)) {
    return { soldQuantities: {} };
  }

  const soldQuantities = Object.fromEntries(
    Object.entries(soldQuantitiesSource).map(([productId, qty]) => {
      const normalized = typeof qty === "number" ? qty : Number(qty);
      if (!Number.isFinite(normalized) || normalized < 0) {
        throw new Error("Quantidade vendida inválida na revisão do condicional.");
      }

      return [productId, Math.floor(normalized)];
    })
  );

  return { soldQuantities };
}

export function conditionalInputToInsertRow(tenantId: string, input: ConditionalCreateInput): ConditionalInsertRow {
  return {
    tenant_id: tenantId,
    client_id: input.clientId,
    due_date: input.dueDate,
    notes: input.notes ?? null,
    status: "open"
  };
}

export function conditionalItemsToInsertRows(
  tenantId: string,
  conditionalId: string,
  items: ConditionalItem[]
): ConditionalItemInsertRow[] {
  return items.map((item) => ({
    tenant_id: tenantId,
    conditional_id: conditionalId,
    product_id: item.productId,
    qty_sent: item.qtySent,
    qty_sold: item.qtySold,
    qty_returned: item.qtyReturned,
    unit_price: item.unitPrice
  }));
}

export function conditionalCheckoutDraftResponse(draft: CheckoutDraft | null) {
  return draft;
}

export function conditionalResponse(record: ConditionalRecord) {
  return record;
}
