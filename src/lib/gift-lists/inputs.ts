import type { Product } from "@/types";

import type { GiftListItemRecord, GiftListMessageRecord, GiftListRecord } from "@/lib/gift-lists/types";

export type GiftListWriteInput = {
  slug?: string;
  hostName?: string;
  eventDate?: string;
  city?: string;
  headline?: string;
  coverImageUrl?: string;
};

export type GiftListItemCreateInput = {
  productId: string;
  note: string;
};

export type GiftListGuestReservationInput = {
  itemId: string;
  guestName: string;
  guestMessage?: string;
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

type GiftListMessageInsertRow = {
  tenant_id: string;
  gift_list_id: string;
  gift_list_item_id: string;
  guest_name: string;
  message: string;
};

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`O campo "${fieldName}" e obrigatorio.`);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Valor textual invalido enviado para lista.");
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredDateString(value: unknown, fieldName: string) {
  const normalized = normalizeRequiredString(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`O campo "${fieldName}" deve estar no formato YYYY-MM-DD.`);
  }

  return normalized;
}

function normalizeSlug(value: unknown, fieldName: string) {
  const normalized = normalizeRequiredString(value, fieldName).toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error(`O campo "${fieldName}" deve usar apenas letras ASCII minusculas, numeros e hifens.`);
  }

  return normalized;
}

function resolveHostName(source: Record<string, unknown>, mode: "create" | "update") {
  const alias = source.hostName ?? source.brideName;
  if (mode === "create") {
    return normalizeRequiredString(alias, "hostName");
  }

  if (alias === undefined) {
    return undefined;
  }

  return normalizeRequiredString(alias, "hostName");
}

export function buildGiftListWriteInput(input: unknown, mode: "create" | "update"): GiftListWriteInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de lista invalido.");
  }

  const source = input as Record<string, unknown>;
  const coverImageValue = source.coverImageUrl ?? source.photo;

  return {
    slug: mode === "create"
      ? normalizeSlug(source.slug, "slug")
      : source.slug === undefined
        ? undefined
        : normalizeSlug(source.slug, "slug"),
    hostName: resolveHostName(source, mode),
    eventDate: mode === "create"
      ? normalizeRequiredDateString(source.eventDate, "eventDate")
      : source.eventDate === undefined
        ? undefined
        : normalizeRequiredDateString(source.eventDate, "eventDate"),
    city: normalizeOptionalString(source.city) ?? undefined,
    headline: normalizeOptionalString(source.headline) ?? undefined,
    coverImageUrl: normalizeOptionalString(coverImageValue) ?? undefined
  };
}

export function buildGiftListItemCreateInput(input: unknown): GiftListItemCreateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de item da lista invalido.");
  }

  const source = input as Record<string, unknown>;
  return {
    productId: normalizeRequiredString(source.productId, "productId"),
    note: normalizeOptionalString(source.note) ?? ""
  };
}

export function buildGiftListGuestReservationInput(input: unknown): GiftListGuestReservationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de reserva invalido.");
  }

  const source = input as Record<string, unknown>;
  const guestMessage = normalizeOptionalString(source.guestMessage ?? source.message) ?? undefined;

  return {
    itemId: normalizeRequiredString(source.itemId, "itemId"),
    guestName: normalizeRequiredString(source.guestName ?? source.name, "guestName"),
    guestMessage
  };
}

export function giftListInputToInsertRow(
  tenantId: string,
  input: GiftListWriteInput,
  hostAccessTokenHash: string
): GiftListInsertRow {
  return {
    tenant_id: tenantId,
    slug: input.slug ?? "",
    host_name: input.hostName ?? "",
    event_date: input.eventDate ?? null,
    city: input.city ?? null,
    headline: input.headline ?? null,
    cover_image_url: input.coverImageUrl ?? null,
    host_access_token_hash: hostAccessTokenHash
  };
}

export function giftListInputToUpdateRow(input: GiftListWriteInput): GiftListUpdateRow {
  const row: GiftListUpdateRow = {};

  if (input.slug !== undefined) {
    row.slug = input.slug;
  }

  if (input.hostName !== undefined) {
    row.host_name = input.hostName;
  }

  if (input.eventDate !== undefined) {
    row.event_date = input.eventDate;
  }

  if (input.city !== undefined) {
    row.city = input.city;
  }

  if (input.headline !== undefined) {
    row.headline = input.headline;
  }

  if (input.coverImageUrl !== undefined) {
    row.cover_image_url = input.coverImageUrl;
  }

  return row;
}

export function giftListItemInputToInsertRow(
  tenantId: string,
  giftListId: string,
  input: GiftListItemCreateInput
): GiftListItemInsertRow {
  return {
    tenant_id: tenantId,
    gift_list_id: giftListId,
    product_id: input.productId,
    note: input.note || null,
    status: "disponivel"
  };
}

export function giftListReservationToUpdateRow(input: GiftListGuestReservationInput): GiftListItemReservationRow {
  return {
    status: "reservado",
    reserved_by_name: input.guestName,
    reserved_message: input.guestMessage ?? null,
    reserved_at: new Date().toISOString()
  };
}

export function giftListMessageToInsertRow(
  tenantId: string,
  giftListId: string,
  giftListItemId: string,
  input: GiftListGuestReservationInput
): GiftListMessageInsertRow | null {
  if (!input.guestMessage) {
    return null;
  }

  return {
    tenant_id: tenantId,
    gift_list_id: giftListId,
    gift_list_item_id: giftListItemId,
    guest_name: input.guestName,
    message: input.guestMessage
  };
}

function serializeProduct(product: Product | null | undefined) {
  return product ?? null;
}

function serializeGiftListItem(item: GiftListItemRecord) {
  return {
    id: item.id,
    productId: item.productId,
    note: item.note,
    status: item.status,
    guestName: item.guestName,
    guestMessage: item.guestMessage,
    reservedAt: item.reservedAt,
    purchasedAt: item.purchasedAt,
    product: serializeProduct(item.product)
  };
}

function serializeGiftListMessage(message: GiftListMessageRecord) {
  return {
    id: message.id,
    giftListItemId: message.giftListItemId,
    guestName: message.guestName,
    message: message.message,
    createdAt: message.createdAt
  };
}

export function giftListResponse(list: GiftListRecord) {
  return {
    id: list.id,
    tenantId: list.tenantId,
    slug: list.slug,
    hostName: list.hostName,
    brideName: list.brideName,
    eventDate: list.eventDate,
    city: list.city,
    headline: list.headline,
    coverImageUrl: list.coverImageUrl,
    photo: list.photo,
    items: list.items.map((item) => serializeGiftListItem(item)),
    messages: list.messages.map((message) => serializeGiftListMessage(message))
  };
}
