import type { CheckoutDraft, ConditionalRecord, Product, SaleRecord } from "@/types";

export function getReservedQuantityForProduct(productId: string, conditionals: ConditionalRecord[]) {
  return conditionals
    .filter((conditional) => conditional.status === "open")
    .reduce((total, conditional) => {
      const conditionalQty = conditional.items
        .filter((item) => item.productId === productId)
        .reduce((sum, item) => sum + item.qtySent, 0);

      return total + conditionalQty;
    }, 0);
}

export function getAvailableStock(productId: string, products: Product[], conditionals: ConditionalRecord[]) {
  const product = products.find((entry) => entry.id === productId);
  if (!product || product.isDeleted) {
    return 0;
  }

  return Math.max(0, product.stock - getReservedQuantityForProduct(productId, conditionals));
}

export function getConditionalDerivedStatus(conditional: ConditionalRecord) {
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

export function getConditionalValue(conditional: ConditionalRecord) {
  return conditional.items.reduce((sum, item) => sum + item.unitPrice * item.qtySent, 0);
}

export function getConditionalConvertedValue(conditional: ConditionalRecord) {
  return conditional.items.reduce((sum, item) => sum + item.unitPrice * item.qtySold, 0);
}

export function getConditionalReturnedValue(conditional: ConditionalRecord) {
  return conditional.items.reduce((sum, item) => sum + item.unitPrice * item.qtyReturned, 0);
}

export function getConditionalVisitRevenue(conditional: ConditionalRecord, sales: SaleRecord[]) {
  if (!conditional.saleId) {
    return 0;
  }

  return sales.find((sale) => sale.id === conditional.saleId)?.total ?? 0;
}

export function getConditionalAdditionalVisitRevenue(conditional: ConditionalRecord, sales: SaleRecord[]) {
  const visitRevenue = getConditionalVisitRevenue(conditional, sales);
  return Math.max(0, visitRevenue - getConditionalConvertedValue(conditional));
}

const CHECKOUT_DRAFT_STORAGE_KEY = "mbgifts-checkout-draft";

export function readCheckoutDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!draft) {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}
