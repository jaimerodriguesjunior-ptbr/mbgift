import type { Product } from "@/types";

export type ProductWriteInput = {
  name?: string;
  category?: string;
  ean?: string | null;
  price?: number;
  stock?: number;
  images?: string[];
  mainImageIndex?: number;
  isDraft?: boolean;
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

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`O campo "${fieldName}" é obrigatório.`);
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
    throw new Error("Valor textual inválido enviado para produto.");
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`O campo "${fieldName}" deve ser um número maior ou igual a zero.`);
  }

  return value;
}

function normalizeOptionalInteger(value: unknown, fieldName: string) {
  const normalized = normalizeOptionalNumber(value, fieldName);
  if (normalized === undefined) {
    return undefined;
  }

  if (!Number.isInteger(normalized)) {
    throw new Error(`O campo "${fieldName}" deve ser um número inteiro.`);
  }

  return normalized;
}

function normalizeImages(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('O campo "images" deve ser uma lista de URLs.');
  }

  return value.map((entry) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error('Cada item de "images" deve ser uma string não vazia.');
    }

    return entry.trim();
  });
}

export function buildProductWriteInput(input: unknown, mode: "create" | "update"): ProductWriteInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de produto inválido.");
  }

  const source = input as Record<string, unknown>;

  return {
    name: mode === "create"
      ? normalizeRequiredString(source.name, "name")
      : source.name === undefined
        ? undefined
        : normalizeRequiredString(source.name, "name"),
    category: source.category === undefined ? undefined : normalizeRequiredString(source.category, "category"),
    ean: normalizeOptionalString(source.ean),
    price: normalizeOptionalNumber(source.price, "price"),
    stock: normalizeOptionalInteger(source.stock, "stock"),
    images: normalizeImages(source.images),
    mainImageIndex: normalizeOptionalInteger(source.mainImageIndex, "mainImageIndex"),
    isDraft: source.isDraft === undefined ? undefined : Boolean(source.isDraft)
  };
}

export function productInputToInsertRow(tenantId: string, input: ProductWriteInput): ProductInsertRow {
  const images = input.images?.length ? input.images : [];

  return {
    tenant_id: tenantId,
    name: input.name ?? "",
    category: input.category?.trim() || "Geral",
    ean: input.ean ?? null,
    price: input.price ?? 0,
    stock_quantity: input.stock ?? 0,
    image_urls: images,
    main_image_index: input.mainImageIndex ?? 0,
    is_draft: input.isDraft ?? false
  };
}

export function productInputToUpdateRow(input: ProductWriteInput): ProductUpdateRow {
  const row: ProductUpdateRow = {};

  if (input.name !== undefined) {
    row.name = input.name;
  }

  if (input.category !== undefined) {
    row.category = input.category || "Geral";
  }

  if (input.ean !== undefined) {
    row.ean = input.ean;
  }

  if (input.price !== undefined) {
    row.price = input.price;
  }

  if (input.stock !== undefined) {
    row.stock_quantity = input.stock;
  }

  if (input.images !== undefined) {
    row.image_urls = input.images;
  }

  if (input.mainImageIndex !== undefined) {
    row.main_image_index = input.mainImageIndex;
  }

  if (input.isDraft !== undefined) {
    row.is_draft = input.isDraft;
  }

  return row;
}

export function productResponse(product: Product) {
  return product;
}
