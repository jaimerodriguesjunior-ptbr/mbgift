import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GiftListItemRecord, GiftListMessageRecord, GiftListRecord } from "@/lib/gift-lists/types";

type GiftListRow = {
  id: string;
  tenant_id: string;
  slug: string;
  host_name: string;
  event_date: string | null;
  city: string | null;
  headline: string | null;
  cover_image_url: string | null;
  host_access_token_hash: string | null;
};

type GiftListItemRow = {
  id: string;
  tenant_id: string;
  gift_list_id: string;
  product_id: string | null;
  note: string | null;
  status: "disponivel" | "reservado" | "comprado";
  reserved_by_name: string | null;
  reserved_message: string | null;
  reserved_at: string | null;
  purchased_at: string | null;
};

type GiftListMessageRow = {
  id: string;
  tenant_id: string;
  gift_list_id: string;
  gift_list_item_id: string | null;
  guest_name: string;
  message: string;
  created_at: string;
};

type GiftListInsertRow = {
  tenant_id: string;
  slug: string;
  host_name: string;
  event_date: string | null;
  city: string | null;
  headline: string | null;
  cover_image_url: string | null;
  host_access_token_hash: string;
};

type GiftListUpdateRow = Partial<Omit<GiftListInsertRow, "tenant_id" | "host_access_token_hash">>;

type GiftListItemInsertRow = {
  tenant_id: string;
  gift_list_id: string;
  product_id: string;
  note: string | null;
  status: "disponivel";
};

type GiftListItemReservationRow = {
  status: "reservado";
  reserved_by_name: string;
  reserved_message: string | null;
  reserved_at: string;
};

type GiftListItemReservationCancellationRow = {
  status: "disponivel";
  reserved_by_name: null;
  reserved_message: null;
  reserved_at: null;
};

type GiftListItemPurchaseRow = {
  status: "comprado";
  purchased_at: string;
};

type GiftListMessageInsertRow = {
  tenant_id: string;
  gift_list_id: string;
  gift_list_item_id: string;
  guest_name: string;
  message: string;
};

const GIFT_LIST_COLUMNS = `
  id,
  tenant_id,
  slug,
  host_name,
  event_date,
  city,
  headline,
  cover_image_url,
  host_access_token_hash
`;

const GIFT_LIST_ITEM_COLUMNS = `
  id,
  tenant_id,
  gift_list_id,
  product_id,
  note,
  status,
  reserved_by_name,
  reserved_message,
  reserved_at,
  purchased_at
`;

const GIFT_LIST_MESSAGE_COLUMNS = `
  id,
  tenant_id,
  gift_list_id,
  gift_list_item_id,
  guest_name,
  message,
  created_at
`;

function mapGiftListRow(row: GiftListRow): GiftListRecord {
  const coverImageUrl = row.cover_image_url ?? "";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    hostName: row.host_name,
    brideName: row.host_name,
    eventDate: row.event_date ?? "",
    city: row.city ?? "",
    headline: row.headline ?? "",
    coverImageUrl,
    photo: coverImageUrl,
    items: [],
    messages: [],
    hostAccessTokenHash: row.host_access_token_hash
  };
}

function mapGiftListItemRow(row: GiftListItemRow): GiftListItemRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    giftListId: row.gift_list_id,
    productId: row.product_id ?? "",
    note: row.note ?? "",
    status: row.status,
    guestName: row.reserved_by_name ?? undefined,
    guestMessage: row.reserved_message ?? undefined,
    reservedAt: row.reserved_at ?? undefined,
    purchasedAt: row.purchased_at ?? undefined,
    product: null
  };
}

function mapGiftListMessageRow(row: GiftListMessageRow): GiftListMessageRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    giftListId: row.gift_list_id,
    giftListItemId: row.gift_list_item_id ?? undefined,
    guestName: row.guest_name,
    message: row.message,
    createdAt: row.created_at
  };
}

async function loadItemsByGiftListIds(giftListIds: string[]) {
  if (giftListIds.length === 0) {
    return new Map<string, GiftListItemRecord[]>();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_list_items")
    .select(GIFT_LIST_ITEM_COLUMNS)
    .in("gift_list_id", giftListIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar itens das listas: ${error.message}`);
  }

  const grouped = new Map<string, GiftListItemRecord[]>();
  for (const entry of data ?? []) {
    const item = mapGiftListItemRow(entry as GiftListItemRow);
    const bucket = grouped.get(item.giftListId) ?? [];
    bucket.push(item);
    grouped.set(item.giftListId, bucket);
  }

  return grouped;
}

async function loadMessagesByGiftListIds(giftListIds: string[]) {
  if (giftListIds.length === 0) {
    return new Map<string, GiftListMessageRecord[]>();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_list_messages")
    .select(GIFT_LIST_MESSAGE_COLUMNS)
    .in("gift_list_id", giftListIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar recados das listas: ${error.message}`);
  }

  const grouped = new Map<string, GiftListMessageRecord[]>();
  for (const entry of data ?? []) {
    const message = mapGiftListMessageRow(entry as GiftListMessageRow);
    const bucket = grouped.get(message.giftListId) ?? [];
    bucket.push(message);
    grouped.set(message.giftListId, bucket);
  }

  return grouped;
}

async function hydrateGiftLists(rows: GiftListRow[]) {
  const lists = rows.map((row) => mapGiftListRow(row));
  const giftListIds = lists.map((list) => list.id);
  const [itemsByGiftListId, messagesByGiftListId] = await Promise.all([
    loadItemsByGiftListIds(giftListIds),
    loadMessagesByGiftListIds(giftListIds)
  ]);

  return lists.map((list) => ({
    ...list,
    items: itemsByGiftListId.get(list.id) ?? [],
    messages: messagesByGiftListId.get(list.id) ?? []
  }));
}

export async function resolveTenantIdBySlug(tenantSlug: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao localizar tenant por slug: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function listGiftListsByTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_lists")
    .select(GIFT_LIST_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar listas: ${error.message}`);
  }

  return hydrateGiftLists((data ?? []) as GiftListRow[]);
}

export async function getGiftListById(tenantId: string, giftListId: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_lists")
    .select(GIFT_LIST_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", giftListId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar lista: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [list] = await hydrateGiftLists([data as GiftListRow]);
  return list ?? null;
}

export async function getGiftListBySlug(slug: string, tenantId?: string) {
  const supabase = getSupabaseAdminClient() as any;
  let request = supabase
    .from("gift_lists")
    .select(GIFT_LIST_COLUMNS)
    .eq("slug", slug)
    .limit(2);

  if (tenantId) {
    request = request.eq("tenant_id", tenantId);
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Falha ao carregar lista por slug: ${error.message}`);
  }

  const rows = (data ?? []) as GiftListRow[];
  if (!tenantId && rows.length > 1) {
    throw new Error("Slug de lista ambiguo entre tenants. Informe o tenant para continuar.");
  }

  if (rows.length === 0) {
    return null;
  }

  const [list] = await hydrateGiftLists([rows[0]]);
  return list ?? null;
}

export async function createGiftList(tenantId: string, values: GiftListInsertRow) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_lists")
    .insert({ ...values, tenant_id: tenantId })
    .select(GIFT_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Falha ao criar lista: ${error.message}`);
  }

  const [list] = await hydrateGiftLists([data as GiftListRow]);
  return list;
}

export async function updateGiftList(tenantId: string, giftListId: string, values: GiftListUpdateRow) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_lists")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", giftListId)
    .select(GIFT_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar lista: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [list] = await hydrateGiftLists([data as GiftListRow]);
  return list ?? null;
}

export async function getGiftListItemById(tenantId: string, giftListId: string, giftListItemId: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_list_items")
    .select(GIFT_LIST_ITEM_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("gift_list_id", giftListId)
    .eq("id", giftListItemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar item da lista: ${error.message}`);
  }

  return data ? mapGiftListItemRow(data as GiftListItemRow) : null;
}

export async function addGiftListItem(tenantId: string, values: GiftListItemInsertRow) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_list_items")
    .insert({ ...values, tenant_id: tenantId })
    .select(GIFT_LIST_ITEM_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Falha ao adicionar item na lista: ${error.message}`);
  }

  return mapGiftListItemRow(data as GiftListItemRow);
}

export async function removeGiftListItem(tenantId: string, giftListId: string, giftListItemId: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase
    .from("gift_list_items")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("gift_list_id", giftListId)
    .eq("id", giftListItemId);

  if (error) {
    throw new Error(`Falha ao remover item da lista: ${error.message}`);
  }
}

export async function reserveGiftListItem(
  tenantId: string,
  giftListId: string,
  giftListItemId: string,
  values: GiftListItemReservationRow,
  messageRow?: GiftListMessageInsertRow | null
) {
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("gift_list_items")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("gift_list_id", giftListId)
    .eq("id", giftListItemId)
    .eq("status", "disponivel")
    .select(GIFT_LIST_ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao reservar item da lista: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (messageRow) {
    const { error: messageError } = await supabase
      .from("gift_list_messages")
      .insert(messageRow);

    if (messageError) {
      throw new Error(`Falha ao registrar recado da lista: ${messageError.message}`);
    }
  }

  return mapGiftListItemRow(data as GiftListItemRow);
}

export async function cancelGiftListItemReservation(
  tenantId: string,
  giftListId: string,
  giftListItemId: string,
  values: GiftListItemReservationCancellationRow
) {
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("gift_list_items")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("gift_list_id", giftListId)
    .eq("id", giftListItemId)
    .eq("status", "reservado")
    .select(GIFT_LIST_ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao cancelar reserva do item da lista: ${error.message}`);
  }

  return data ? mapGiftListItemRow(data as GiftListItemRow) : null;
}

export async function purchaseGiftListItem(
  tenantId: string,
  giftListItemId: string,
  values: GiftListItemPurchaseRow
) {
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("gift_list_items")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", giftListItemId)
    .in("status", ["disponivel", "reservado"])
    .select(GIFT_LIST_ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao marcar item da lista como comprado: ${error.message}`);
  }

  return data ? mapGiftListItemRow(data as GiftListItemRow) : null;
}

export async function updateGiftListToken(tenantId: string, giftListId: string, hostAccessTokenHash: string) {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("gift_lists")
    .update({ host_access_token_hash: hostAccessTokenHash })
    .eq("tenant_id", tenantId)
    .eq("id", giftListId)
    .select(GIFT_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar token da lista: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [list] = await hydrateGiftLists([data as GiftListRow]);
  return list ?? null;
}

