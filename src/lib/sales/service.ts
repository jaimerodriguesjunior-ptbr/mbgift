import "server-only";

import { getClientById } from "@/lib/clients/repository";
import { finalizeConditionalAfterSale, getConditionalById, getReservedQuantityForProduct } from "@/lib/conditionals/repository";
import { purchaseGiftListItem } from "@/lib/gift-lists/repository";
import { getProductById } from "@/lib/products/repository";
import { cancelSaleRecord, createSaleRecord, decrementProductStock, listSalesByTenant } from "@/lib/sales/repository";
import { buildSaleCreateInput, saleInputToInsertRow, saleItemsToInsertRows, salePaymentsToInsertRows } from "@/lib/sales/inputs";
import { getCurrentTenantMembership } from "@/lib/tenants/membership";

export async function listCurrentTenantSales() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  return listSalesByTenant(membership.tenantId);
}

export async function createCurrentTenantSale(input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  const payload = buildSaleCreateInput(input);
  const aggregatedItems = payload.items.reduce<Array<{ productId: string; qty: number; giftListItemId?: string; sourceType: "direct" | "conditional" }>>((acc, item) => {
    const existing = acc.find(
      (entry) =>
        entry.productId === item.productId &&
        (entry.giftListItemId ?? "") === (item.giftListItemId ?? "") &&
        entry.sourceType === item.sourceType
    );
    if (existing) {
      existing.qty += item.qty;
      return acc;
    }

    acc.push({
      ...item,
      sourceType: item.sourceType === "conditional" ? "conditional" : "direct"
    });
    return acc;
  }, []);

  const soldQuantities: Record<string, number> = {};
  const saleItems: Array<{ productId: string; qty: number; unitPrice: number; giftListItemId?: string; sourceType: "direct" | "conditional" }> = [];

  for (const item of aggregatedItems) {
    const product = await getProductById(membership.tenantId, item.productId);
    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    const reservedQty = payload.originType === "conditional" && payload.originId && item.sourceType === "conditional"
      ? Math.max(0, await getReservedQuantityForProduct(membership.tenantId, item.productId) - item.qty)
      : await getReservedQuantityForProduct(membership.tenantId, item.productId);

    const availableForSale = Math.max(0, product.stock - reservedQty);
    if (item.qty > availableForSale) {
      throw new Error(`Estoque insuficiente para ${product.name}.`);
    }

    if (item.sourceType === "conditional") {
      soldQuantities[item.productId] = (soldQuantities[item.productId] ?? 0) + item.qty;
    }

    if (item.giftListItemId && item.qty !== 1) {
      throw new Error("Cada reserva de presente deve ser baixada individualmente.");
    }

    saleItems.push({
      productId: item.productId,
      qty: item.qty,
      unitPrice: product.price,
      giftListItemId: item.giftListItemId,
      sourceType: item.sourceType
    });
  }

  let clientName: string | undefined;
  if (payload.clientId) {
    const client = await getClientById(membership.tenantId, payload.clientId);
    clientName = client?.name;
  }

  if (payload.originType === "conditional" && payload.originId) {
    const conditional = await getConditionalById(membership.tenantId, payload.originId);
    if (!conditional || conditional.status !== "open") {
      throw new Error("Condicional não encontrado ou já finalizado.");
    }
  }

  const sale = await createSaleRecord(
    membership.tenantId,
    saleInputToInsertRow(membership.tenantId, payload, clientName),
    saleItemsToInsertRows(membership.tenantId, "", saleItems),
    salePaymentsToInsertRows(membership.tenantId, "", payload.payments)
  );

  for (const item of saleItems) {
    await decrementProductStock(membership.tenantId, item.productId, item.qty);
  }

  for (const item of saleItems) {
    if (!item.giftListItemId) {
      continue;
    }

    const purchasedItem = await purchaseGiftListItem(membership.tenantId, item.giftListItemId, {
      status: "comprado",
      purchased_at: new Date().toISOString()
    });

    if (!purchasedItem) {
      throw new Error("Não foi possível marcar o presente da lista como comprado.");
    }
  }

  if (payload.originType === "conditional" && payload.originId) {
    await finalizeConditionalAfterSale(membership.tenantId, payload.originId, sale.id, soldQuantities);
  }

  return sale;
}

export async function cancelCurrentTenantSale(saleId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  const normalizedSaleId = saleId.trim();
  if (!normalizedSaleId) {
    throw new Error("Venda inválida.");
  }

  await cancelSaleRecord(membership.tenantId, normalizedSaleId);
  return listSalesByTenant(membership.tenantId);
}
