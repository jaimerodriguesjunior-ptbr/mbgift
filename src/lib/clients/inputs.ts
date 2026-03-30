import type { Client } from "@/types";

export type ClientWriteInput = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  photo?: string | null;
  cpf?: string | null;
  address?: string | null;
  isTrusted?: boolean;
};

type ClientInsertRow = {
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  photo_url: string | null;
  cpf: string | null;
  address_text: string | null;
  is_trusted: boolean;
};

type ClientUpdateRow = Partial<Omit<ClientInsertRow, "tenant_id">>;

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
    throw new Error("Valor textual inválido enviado para cliente.");
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildClientWriteInput(input: unknown, mode: "create" | "update"): ClientWriteInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de cliente inválido.");
  }

  const source = input as Record<string, unknown>;

  return {
    name: mode === "create"
      ? normalizeRequiredString(source.name, "name")
      : source.name === undefined
        ? undefined
        : normalizeRequiredString(source.name, "name"),
    phone: normalizeOptionalString(source.phone),
    email: normalizeOptionalString(source.email),
    instagram: normalizeOptionalString(source.instagram),
    photo: normalizeOptionalString(source.photo),
    cpf: normalizeOptionalString(source.cpf),
    address: normalizeOptionalString(source.address),
    isTrusted: source.isTrusted === undefined ? undefined : Boolean(source.isTrusted)
  };
}

export function clientInputToInsertRow(tenantId: string, input: ClientWriteInput): ClientInsertRow {
  return {
    tenant_id: tenantId,
    name: input.name ?? "",
    phone: input.phone ?? null,
    email: input.email ?? null,
    instagram: input.instagram ?? null,
    photo_url: input.photo ?? null,
    cpf: input.cpf ?? null,
    address_text: input.address ?? null,
    is_trusted: input.isTrusted ?? false
  };
}

export function clientInputToUpdateRow(input: ClientWriteInput): ClientUpdateRow {
  const row: ClientUpdateRow = {};

  if (input.name !== undefined) {
    row.name = input.name;
  }

  if (input.phone !== undefined) {
    row.phone = input.phone;
  }

  if (input.email !== undefined) {
    row.email = input.email;
  }

  if (input.instagram !== undefined) {
    row.instagram = input.instagram;
  }

  if (input.photo !== undefined) {
    row.photo_url = input.photo;
  }

  if (input.cpf !== undefined) {
    row.cpf = input.cpf;
  }

  if (input.address !== undefined) {
    row.address_text = input.address;
  }

  if (input.isTrusted !== undefined) {
    row.is_trusted = input.isTrusted;
  }

  return row;
}

export function clientResponse(client: Client) {
  return client;
}
