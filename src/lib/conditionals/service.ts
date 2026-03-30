import "server-only";

import { getClientById } from "@/lib/clients/repository";
import { getProductById } from "@/lib/products/repository";
import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";
import {
  buildConditionalCreateInput,
  buildConditionalReviewInput,
  conditionalInputToInsertRow,
  conditionalItemsToInsertRows
} from "@/lib/conditionals/inputs";
import {
  createConditionalRecord,
  finalizeConditionalAsReturned,
  getConditionalById,
  getOpenConditionalByClientId,
  getReservedQuantityForProduct,
  listConditionalsByTenant,
  markConditionalReceiptPrinted
} from "@/lib/conditionals/repository";
import type { CheckoutDraft, ConditionalItem } from "@/types";

export async function listCurrentTenantConditionals() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  return listConditionalsByTenant(membership.tenantId);
}

export async function getCurrentTenantConditional(conditionalId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  return getConditionalById(membership.tenantId, conditionalId);
}

export async function createCurrentTenantConditional(input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const payload = buildConditionalCreateInput(input);

  const client = await getClientById(membership.tenantId, payload.clientId);
  if (!client) {
    throw new Error("Cliente não encontrado.");
  }

  if (!client.isTrusted) {
    throw new Error("Este cliente está bloqueado para condicional.");
  }

  const existingOpenConditionalId = await getOpenConditionalByClientId(membership.tenantId, payload.clientId);
  if (existingOpenConditionalId) {
    throw new Error("Este cliente já possui um condicional em aberto.");
  }

  const items: ConditionalItem[] = [];
  for (const item of payload.items) {
    const product = await getProductById(membership.tenantId, item.productId);
    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    const reserved = await getReservedQuantityForProduct(membership.tenantId, item.productId);
    const availableStock = Math.max(0, product.stock - reserved);
    if (item.qtySent > availableStock) {
      throw new Error(`Estoque indisponível para ${product.name}.`);
    }

    items.push({
      productId: item.productId,
      qtySent: item.qtySent,
      qtySold: 0,
      qtyReturned: 0,
      unitPrice: product.price
    });
  }

  return createConditionalRecord(
    membership.tenantId,
    conditionalInputToInsertRow(membership.tenantId, payload),
    conditionalItemsToInsertRows(membership.tenantId, "", items)
  );
}

export async function markCurrentTenantConditionalReceiptPrinted(conditionalId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  await markConditionalReceiptPrinted(membership.tenantId, conditionalId);
  return getConditionalById(membership.tenantId, conditionalId);
}

export async function closeCurrentTenantConditionalAsReturned(conditionalId: string, input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const review = buildConditionalReviewInput(input);
  const hasSoldItems = Object.values(review.soldQuantities).some((value) => value > 0);

  if (hasSoldItems) {
    throw new Error("Use a preparação para caixa quando houver itens vendidos.");
  }

  return finalizeConditionalAsReturned(membership.tenantId, conditionalId);
}

export async function prepareCurrentTenantConditionalCheckout(conditionalId: string, input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const review = buildConditionalReviewInput(input);
  const conditional = await getConditionalById(membership.tenantId, conditionalId);

  if (!conditional || conditional.status !== "open") {
    throw new Error("Condicional não encontrado ou já finalizado.");
  }

  const checkoutItems = conditional.items
    .map((item) => {
      const qtySold = Math.max(0, Math.min(item.qtySent, review.soldQuantities[item.productId] ?? 0));
      return qtySold > 0
        ? {
            productId: item.productId,
            qty: qtySold
          }
        : null;
    })
    .filter(Boolean) as CheckoutDraft["items"];

  if (checkoutItems.length === 0) {
    await finalizeConditionalAsReturned(membership.tenantId, conditionalId);
    return null;
  }

  return {
    originType: "conditional",
    originId: conditional.id,
    clientId: conditional.clientId,
    createdAt: new Date().toISOString(),
    items: checkoutItems
  } satisfies CheckoutDraft;
}
