import "server-only";

import { getProductsByIds } from "@/lib/products/repository";
import {
  buildGiftListGuestReservationInput,
  buildGiftListItemCreateInput,
  buildGiftListWriteInput,
  giftListInputToInsertRow,
  giftListInputToUpdateRow,
  giftListItemInputToInsertRow,
  giftListMessageToInsertRow,
  giftListReservationToUpdateRow
} from "@/lib/gift-lists/inputs";
import {
  addGiftListItem,
  cancelGiftListItemReservation,
  createGiftList,
  getGiftListById,
  getGiftListBySlug,
  listGiftListsByTenant,
  removeGiftListItem,
  reserveGiftListItem,
  resolveTenantIdBySlug,
  updateGiftList
} from "@/lib/gift-lists/repository";
import { generateHostAccessToken, hashHostAccessToken, verifyHostAccessToken } from "@/lib/gift-lists/tokens";
import type { GiftListRecord } from "@/lib/gift-lists/types";
import { listProductsByTenantAdmin } from "@/lib/products/repository";
import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";

async function attachProducts(list: GiftListRecord) {
  const productIds = [...new Set(list.items.map((item) => item.productId).filter(Boolean))];
  const products = await getProductsByIds(list.tenantId, productIds);
  const productMap = new Map(products.map((product) => [product.id, product]));

  return {
    ...list,
    items: list.items.map((item) => ({
      ...item,
      product: productMap.get(item.productId) ?? null
    }))
  } satisfies GiftListRecord;
}

async function attachProductsOrNull(list: GiftListRecord | null) {
  return list ? attachProducts(list) : null;
}

async function attachProductsToMany(lists: GiftListRecord[]) {
  return Promise.all(lists.map((list) => attachProducts(list)));
}

async function requireCurrentTenantId() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return membership;
}

async function resolveGiftListForTokenAccess(slug: string, tenantSlug: string | undefined, token: string) {
  if (!token) {
    throw new Error("Token de anfitriao obrigatorio.");
  }

  const tenantId = tenantSlug ? await resolveTenantIdBySlug(tenantSlug) : null;
  if (tenantSlug && !tenantId) {
    throw new Error("Tenant informado nao foi encontrado.");
  }

  const giftList = await getGiftListBySlug(slug, tenantId ?? undefined);
  if (!giftList) {
    return null;
  }

  if (!verifyHostAccessToken(token, giftList.hostAccessTokenHash)) {
    throw new Error("Token de anfitriao invalido.");
  }

  return giftList;
}

export async function listCurrentTenantGiftLists() {
  const membership = await requireCurrentTenantId();
  const lists = await listGiftListsByTenant(membership.tenantId);

  return attachProductsToMany(lists);
}

export async function getCurrentTenantGiftList(giftListId: string) {
  const membership = await requireCurrentTenantId();
  const giftList = await getGiftListById(membership.tenantId, giftListId);
  return attachProductsOrNull(giftList);
}

export async function createCurrentTenantGiftList(input: unknown) {
  const membership = await requireCurrentTenantId();
  assertCanManageTenant(membership.role);

  const payload = buildGiftListWriteInput(input, "create");
  const hostAccessToken = generateHostAccessToken();
  const giftList = await createGiftList(
    membership.tenantId,
    giftListInputToInsertRow(membership.tenantId, payload, hashHostAccessToken(hostAccessToken))
  );

  return {
    giftList: await attachProducts(giftList),
    hostAccessToken
  };
}

export async function updateCurrentTenantGiftList(giftListId: string, input: unknown) {
  const membership = await requireCurrentTenantId();
  assertCanManageTenant(membership.role);

  const payload = buildGiftListWriteInput(input, "update");
  const giftList = await updateGiftList(membership.tenantId, giftListId, giftListInputToUpdateRow(payload));
  return attachProductsOrNull(giftList);
}

export async function addCurrentTenantGiftListItem(giftListId: string, input: unknown) {
  const membership = await requireCurrentTenantId();
  assertCanManageTenant(membership.role);

  const payload = buildGiftListItemCreateInput(input);
  const giftList = await getGiftListById(membership.tenantId, giftListId);
  if (!giftList) {
    throw new Error("Lista nao encontrada.");
  }

  const [product] = await getProductsByIds(membership.tenantId, [payload.productId]);
  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  if (product.isDraft) {
    throw new Error("Produtos em rascunho nao podem entrar na lista.");
  }

  if (giftList.items.some((item) => item.productId === payload.productId)) {
    throw new Error("Este produto ja esta na lista.");
  }

  await addGiftListItem(
    membership.tenantId,
    giftListItemInputToInsertRow(membership.tenantId, giftListId, payload)
  );

  return getCurrentTenantGiftList(giftListId);
}

export async function removeCurrentTenantGiftListItem(giftListId: string, giftListItemId: string) {
  const membership = await requireCurrentTenantId();
  assertCanManageTenant(membership.role);

  const giftList = await getGiftListById(membership.tenantId, giftListId);
  if (!giftList) {
    throw new Error("Lista nao encontrada.");
  }

  await removeGiftListItem(membership.tenantId, giftListId, giftListItemId);
  return getCurrentTenantGiftList(giftListId);
}

export async function cancelCurrentTenantGiftListItemReservation(giftListId: string, giftListItemId: string) {
  const membership = await requireCurrentTenantId();
  assertCanManageTenant(membership.role);

  const giftList = await getGiftListById(membership.tenantId, giftListId);
  if (!giftList) {
    throw new Error("Lista nao encontrada.");
  }

  const giftListItem = giftList.items.find((item) => item.id === giftListItemId);
  if (!giftListItem) {
    throw new Error("Item da lista nao encontrado.");
  }

  if (giftListItem.status !== "reservado") {
    throw new Error("Apenas itens reservados podem ter a reserva cancelada.");
  }

  const updatedItem = await cancelGiftListItemReservation(membership.tenantId, giftListId, giftListItemId, {
    status: "disponivel",
    reserved_by_name: null,
    reserved_message: null,
    reserved_at: null
  });

  if (!updatedItem) {
    throw new Error("Esta reserva ja nao estava ativa.");
  }

  return getCurrentTenantGiftList(giftListId);
}

export async function getPublicGiftListBySlug(slug: string, tenantSlug?: string) {
  const tenantId = tenantSlug ? await resolveTenantIdBySlug(tenantSlug) : null;
  if (tenantSlug && !tenantId) {
    throw new Error("Tenant informado nao foi encontrado.");
  }

  const giftList = await getGiftListBySlug(slug, tenantId ?? undefined);
  return attachProductsOrNull(giftList);
}

export async function getHostGiftListBySlug(slug: string, token: string, tenantSlug?: string) {
  const giftList = await resolveGiftListForTokenAccess(slug, tenantSlug, token);
  return attachProductsOrNull(giftList);
}

export async function updateHostGiftListBySlug(slug: string, token: string, input: unknown, tenantSlug?: string) {
  const giftList = await resolveGiftListForTokenAccess(slug, tenantSlug, token);
  if (!giftList) {
    return null;
  }

  const payload = buildGiftListWriteInput(input, "update");
  const updated = await updateGiftList(giftList.tenantId, giftList.id, giftListInputToUpdateRow(payload));
  return attachProductsOrNull(updated);
}

export async function addHostGiftListItemBySlug(slug: string, token: string, input: unknown, tenantSlug?: string) {
  const giftList = await resolveGiftListForTokenAccess(slug, tenantSlug, token);
  if (!giftList) {
    return null;
  }

  const payload = buildGiftListItemCreateInput(input);
  const [product] = await getProductsByIds(giftList.tenantId, [payload.productId]);
  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  if (product.isDraft) {
    throw new Error("Produtos em rascunho nao podem entrar na lista.");
  }

  if (giftList.items.some((item) => item.productId === payload.productId)) {
    throw new Error("Este produto ja esta na lista.");
  }

  await addGiftListItem(
    giftList.tenantId,
    giftListItemInputToInsertRow(giftList.tenantId, giftList.id, payload)
  );

  return getHostGiftListBySlug(slug, token, tenantSlug);
}

export async function removeHostGiftListItemBySlug(
  slug: string,
  token: string,
  giftListItemId: string,
  tenantSlug?: string
) {
  const giftList = await resolveGiftListForTokenAccess(slug, tenantSlug, token);
  if (!giftList) {
    return null;
  }

  await removeGiftListItem(giftList.tenantId, giftList.id, giftListItemId);
  return getHostGiftListBySlug(slug, token, tenantSlug);
}

export async function listHostGiftListProductsBySlug(slug: string, token: string, tenantSlug?: string) {
  const giftList = await resolveGiftListForTokenAccess(slug, tenantSlug, token);
  if (!giftList) {
    return null;
  }

  return listProductsByTenantAdmin(giftList.tenantId);
}

export async function reservePublicGiftBySlug(slug: string, input: unknown, tenantSlug?: string) {
  const tenantId = tenantSlug ? await resolveTenantIdBySlug(tenantSlug) : null;
  if (tenantSlug && !tenantId) {
    throw new Error("Tenant informado nao foi encontrado.");
  }

  const giftList = await getGiftListBySlug(slug, tenantId ?? undefined);
  if (!giftList) {
    throw new Error("Lista nao encontrada.");
  }

  const payload = buildGiftListGuestReservationInput(input);
  const giftListItem = giftList.items.find((item) => item.id === payload.itemId);
  if (!giftListItem) {
    throw new Error("Item da lista nao encontrado.");
  }

  if (giftListItem.status !== "disponivel") {
    throw new Error("Este presente ja foi reservado ou comprado.");
  }

  const reservedItem = await reserveGiftListItem(
    giftList.tenantId,
    giftList.id,
    giftListItem.id,
    giftListReservationToUpdateRow(payload),
    giftListMessageToInsertRow(giftList.tenantId, giftList.id, giftListItem.id, payload)
  );

  if (!reservedItem) {
    throw new Error("Este presente deixou de estar disponivel.");
  }

  return getPublicGiftListBySlug(slug, tenantSlug);
}
