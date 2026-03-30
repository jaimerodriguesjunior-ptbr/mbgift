import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

type ProductRow = {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  ean: string | null;
  price: number | string;
  stock_quantity: number;
  image_urls: unknown;
  main_image_index: number;
  is_draft: boolean;
  deleted_at: string | null;
};

type ProductInsertRow = {
  tenant_id: string;
  name: string;
  category: string;
  ean: string | null;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  main_image_index: number;
  is_draft: boolean;
};

type ProductUpdateRow = Partial<Omit<ProductInsertRow, "tenant_id">>;

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function mapProductRow(row: ProductRow): Product {
  const images = normalizeImages(row.image_urls);

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    price: Number(row.price),
    stock: row.stock_quantity,
    images,
    mainImageIndex: Math.max(0, Math.min(row.main_image_index, Math.max(images.length - 1, 0))),
    category: row.category,
    ean: row.ean ?? "",
    isDraft: row.is_draft,
    isDeleted: Boolean(row.deleted_at)
  };
}

const PRODUCT_COLUMNS = `
  id,
  tenant_id,
  name,
  category,
  ean,
  price,
  stock_quantity,
  image_urls,
  main_image_index,
  is_draft,
  deleted_at
`;

export async function listProductsByTenant(tenantId: string, query?: string) {
  const supabase = createSupabaseServerClient();
  let request = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    request = request.or(
      `name.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%,ean.ilike.%${normalizedQuery}%`
    );
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Falha ao listar produtos: ${error.message}`);
  }

  return (data ?? []).map((entry) => mapProductRow(entry as ProductRow));
}

export async function listProductsByTenantAdmin(tenantId: string, query?: string) {
  const supabase = getSupabaseAdminClient();
  let request = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    request = request.or(
      `name.ilike.%${normalizedQuery}%,category.ilike.%${normalizedQuery}%,ean.ilike.%${normalizedQuery}%`
    );
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Falha ao listar produtos no modo admin: ${error.message}`);
  }

  return (data ?? []).map((entry) => mapProductRow(entry as ProductRow));
}

export async function getProductById(tenantId: string, productId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar produto: ${error.message}`);
  }

  return data ? mapProductRow(data as ProductRow) : null;
}

export async function getProductsByIds(tenantId: string, productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", tenantId)
    .in("id", productIds);

  if (error) {
    throw new Error(`Falha ao carregar produtos da lista: ${error.message}`);
  }

  return (data ?? []).map((entry) => mapProductRow(entry as ProductRow));
}

export async function createProduct(tenantId: string, values: ProductInsertRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...values, tenant_id: tenantId })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Falha ao criar produto: ${error.message}`);
  }

  return mapProductRow(data as ProductRow);
}

export async function updateProduct(tenantId: string, productId: string, values: ProductUpdateRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update(values)
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar produto: ${error.message}`);
  }

  return data ? mapProductRow(data as ProductRow) : null;
}

async function countProductReferences(
  table: "gift_list_items" | "conditional_items" | "sale_items",
  tenantId: string,
  productId: string
) {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Falha ao verificar referencias do produto em ${table}: ${error.message}`);
  }

  return count ?? 0;
}

export async function getProductUsageSummary(tenantId: string, productId: string) {
  const [giftListItems, conditionalItems, saleItems] = await Promise.all([
    countProductReferences("gift_list_items", tenantId, productId),
    countProductReferences("conditional_items", tenantId, productId),
    countProductReferences("sale_items", tenantId, productId)
  ]);

  const totalReferences = giftListItems + conditionalItems + saleItems;

  return {
    giftListItems,
    conditionalItems,
    saleItems,
    totalReferences,
    hasReferences: totalReferences > 0
  };
}

export async function softDeleteProduct(tenantId: string, productId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Falha ao arquivar produto: ${error.message}`);
  }
}

export async function hardDeleteProduct(tenantId: string, productId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Falha ao excluir produto: ${error.message}`);
  }
}
