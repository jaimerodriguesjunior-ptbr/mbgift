import type { CheckoutDraft, Client, ConditionalRecord, Product, SaleRecord } from "@/types";
import type { GiftListRecord } from "@/lib/gift-lists/types";
import type { TenantStoreIdentity } from "@/lib/tenants/types";

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && typeof payload.error === "string"
      ? payload.error
      : "Falha ao comunicar com a API.";
    throw new Error(message);
  }

  return payload;
}

export async function fetchCurrentTenantSettings() {
  const payload = await parseJson(await fetch("/api/tenant/current", { cache: "no-store" }));
  return payload.tenant as TenantStoreIdentity | null;
}

export async function updateCurrentTenantSettings(input: Partial<TenantStoreIdentity>) {
  const payload = await parseJson(
    await fetch("/api/tenant/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.tenant as TenantStoreIdentity | null;
}

export async function fetchProducts() {
  const payload = await parseJson(await fetch("/api/products", { cache: "no-store" }));
  return (payload.products ?? []) as Product[];
}

export async function createProduct(input: Partial<Product>) {
  const payload = await parseJson(
    await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.product as Product;
}

export async function updateProduct(productId: string, input: Partial<Product>) {
  const payload = await parseJson(
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.product as Product;
}

export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const payload = await parseJson(
    await fetch("/api/uploads/product-images", {
      method: "POST",
      body: formData
    })
  );

  return {
    path: payload.path as string,
    publicUrl: payload.publicUrl as string
  };
}

export async function uploadGiftListCover(
  file: File,
  options?: {
    giftListSlug?: string;
    hostToken?: string;
    tenantSlug?: string;
  }
) {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.giftListSlug) {
    formData.append("giftListSlug", options.giftListSlug);
  }

  if (options?.hostToken) {
    formData.append("hostToken", options.hostToken);
  }

  if (options?.tenantSlug) {
    formData.append("tenantSlug", options.tenantSlug);
  }

  const payload = await parseJson(
    await fetch("/api/uploads/gift-list-covers", {
      method: "POST",
      body: formData
    })
  );

  return {
    path: payload.path as string,
    publicUrl: payload.publicUrl as string
  };
}

export async function deleteProduct(productId: string) {
  const payload = await parseJson(
    await fetch(`/api/products/${productId}`, {
      method: "DELETE"
    })
  );

  return payload as {
    mode: "hard" | "soft";
    productId: string;
    usage: {
      giftListItems: number;
      conditionalItems: number;
      saleItems: number;
      totalReferences: number;
      hasReferences: boolean;
    };
  };
}

export async function fetchClients() {
  const payload = await parseJson(await fetch("/api/clients", { cache: "no-store" }));
  return (payload.clients ?? []) as Client[];
}

export async function createClient(input: Partial<Client>) {
  const payload = await parseJson(
    await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.client as Client;
}

export async function updateClient(clientId: string, input: Partial<Client>) {
  const payload = await parseJson(
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.client as Client;
}

export async function deleteClient(clientId: string) {
  const payload = await parseJson(
    await fetch(`/api/clients/${clientId}`, {
      method: "DELETE"
    })
  );

  return payload as {
    clientId: string;
    usage: {
      sales: number;
      conditionals: number;
      totalReferences: number;
      hasReferences: boolean;
    };
  };
}

export async function fetchConditionals() {
  const payload = await parseJson(await fetch("/api/conditionals", { cache: "no-store" }));
  return (payload.conditionals ?? []) as ConditionalRecord[];
}

export async function createConditional(input: {
  clientId: string;
  dueDate: string;
  notes?: string;
  items: Array<{ productId: string; qtySent: number }>;
}) {
  const payload = await parseJson(
    await fetch("/api/conditionals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.conditional as ConditionalRecord | null;
}

export async function markConditionalReceiptPrinted(conditionalId: string) {
  const payload = await parseJson(
    await fetch(`/api/conditionals/${conditionalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "mark_receipt_printed" })
    })
  );

  return payload.conditional as ConditionalRecord | null;
}

export async function closeConditionalAsReturned(
  conditionalId: string,
  soldQuantities: Record<string, number> = {}
) {
  const payload = await parseJson(
    await fetch(`/api/conditionals/${conditionalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "close_returned",
        soldQuantities
      })
    })
  );

  return payload.conditional as ConditionalRecord | null;
}

export async function prepareConditionalCheckout(
  conditionalId: string,
  soldQuantities: Record<string, number>
) {
  const payload = await parseJson(
    await fetch(`/api/conditionals/${conditionalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "prepare_checkout",
        soldQuantities
      })
    })
  );

  return payload.checkoutDraft as CheckoutDraft | null;
}

export async function fetchSales() {
  const payload = await parseJson(await fetch("/api/sales", { cache: "no-store" }));
  return (payload.sales ?? []) as SaleRecord[];
}

export async function createSale(input: {
  total: number;
  payments: Array<{ method: string; amount: number }>;
  clientId?: string;
  cpf?: string;
  items: Array<{ productId: string; qty: number; giftListItemId?: string; sourceType?: "direct" | "conditional" }>;
  originType: "direct" | "conditional";
  originId?: string;
}) {
  const payload = await parseJson(
    await fetch("/api/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.sale as SaleRecord;
}

export async function cancelSale(saleId: string) {
  const payload = await parseJson(
    await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "cancel"
      })
    })
  );

  return (payload.sales ?? []) as SaleRecord[];
}

export async function fetchGiftLists() {
  const payload = await parseJson(await fetch("/api/gift-lists", { cache: "no-store" }));
  return (payload.giftLists ?? []) as GiftListRecord[];
}

export async function createGiftList(input: {
  slug: string;
  hostName: string;
  eventDate: string;
  city?: string;
  headline?: string;
  coverImageUrl?: string;
}) {
  const payload = await parseJson(
    await fetch("/api/gift-lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    hostAccessToken: typeof payload.hostAccessToken === "string" ? payload.hostAccessToken : ""
  };
}

export async function cancelGiftListItemReservation(giftListId: string, giftListItemId: string) {
  const payload = await parseJson(
    await fetch(`/api/gift-lists/${giftListId}/items/${giftListItemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "cancel_reservation"
      })
    })
  );

  return (payload.giftList ?? null) as GiftListRecord | null;
}

export async function fetchPublicGiftList(slug: string, tenantSlug?: string) {
  const params = new URLSearchParams();
  if (tenantSlug) {
    params.set("tenant", tenantSlug);
  }

  const query = params.toString();
  const payload = await parseJson(
    await fetch(`/api/public/gift-lists/${slug}${query ? `?${query}` : ""}`, { cache: "no-store" })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    tenant: (payload.tenant ?? null) as TenantStoreIdentity | null
  };
}

export async function reservePublicGift(
  slug: string,
  input: {
    itemId: string;
    guestName: string;
    guestMessage?: string;
    tenantSlug?: string;
  }
) {
  const payload = await parseJson(
    await fetch(`/api/public/gift-lists/${slug}/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    tenant: (payload.tenant ?? null) as TenantStoreIdentity | null
  };
}

export async function fetchHostGiftList(slug: string, token: string, tenantSlug?: string) {
  const params = new URLSearchParams({ token });
  if (tenantSlug) {
    params.set("tenant", tenantSlug);
  }

  const payload = await parseJson(
    await fetch(`/api/host/gift-lists/${slug}?${params.toString()}`, { cache: "no-store" })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    tenant: (payload.tenant ?? null) as TenantStoreIdentity | null
  };
}

export async function updateHostGiftList(
  slug: string,
  token: string,
  input: {
    hostName?: string;
    eventDate?: string;
    city?: string;
    headline?: string;
    coverImageUrl?: string;
    tenantSlug?: string;
  }
) {
  const payload = await parseJson(
    await fetch(`/api/host/gift-lists/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        ...input
      })
    })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    tenant: (payload.tenant ?? null) as TenantStoreIdentity | null
  };
}

export async function fetchHostGiftListProducts(slug: string, token: string, tenantSlug?: string) {
  const params = new URLSearchParams({ token });
  if (tenantSlug) {
    params.set("tenant", tenantSlug);
  }

  const payload = await parseJson(
    await fetch(`/api/host/gift-lists/${slug}/products?${params.toString()}`, { cache: "no-store" })
  );

  return (payload.products ?? []) as Product[];
}

export async function addHostGiftListItem(
  slug: string,
  input: {
    token: string;
    productId: string;
    note?: string;
    tenantSlug?: string;
  }
) {
  const payload = await parseJson(
    await fetch(`/api/host/gift-lists/${slug}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  return payload.giftList as GiftListRecord | null;
}

export async function removeHostGiftListItem(
  slug: string,
  itemId: string,
  token: string,
  tenantSlug?: string
) {
  const params = new URLSearchParams({ token });
  if (tenantSlug) {
    params.set("tenant", tenantSlug);
  }

  const payload = await parseJson(
    await fetch(`/api/host/gift-lists/${slug}/items/${itemId}?${params.toString()}`, {
      method: "DELETE"
    })
  );

  return payload.giftList as GiftListRecord | null;
}

export async function regenerateGiftListToken(giftListId: string) {
  const payload = await parseJson(
    await fetch(`/api/gift-lists/${giftListId}/token`, {
      method: "POST"
    })
  );

  return {
    giftList: (payload.giftList ?? null) as GiftListRecord | null,
    hostAccessToken: typeof payload.hostAccessToken === "string" ? payload.hostAccessToken : ""
  };
}

export async function deleteGiftListById(giftListId: string) {
  await parseJson(
    await fetch(`/api/gift-lists/${giftListId}`, {
      method: "DELETE"
    })
  );
}

export async function deleteConditionalById(conditionalId: string) {
  await parseJson(
    await fetch(`/api/conditionals/${conditionalId}`, {
      method: "DELETE"
    })
  );
}
