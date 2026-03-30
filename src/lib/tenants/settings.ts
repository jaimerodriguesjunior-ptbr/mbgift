import type { TenantStoreIdentity } from "@/lib/tenants/types";

export type TenantSettingsUpdateInput = {
  businessName?: string;
  displayName?: string;
  logoLabel?: string | null;
  tagline?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  documentCnpj?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  stateRegistration?: string | null;
  municipalRegistration?: string | null;
  taxRegime?: string | null;
};

type TenantSettingsUpdateRow = {
  business_name?: string;
  display_name?: string;
  logo_label?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  document_cnpj?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip_code?: string | null;
  state_registration?: string | null;
  municipal_registration?: string | null;
  tax_regime?: string | null;
};

const colorRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    throw new Error("Valor inválido enviado para configuração textual.");
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalColor(value: unknown, fieldName: string) {
  const normalized = normalizeOptionalString(value);

  if (normalized && !colorRegex.test(normalized)) {
    throw new Error(`O campo "${fieldName}" deve usar cor hexadecimal válida.`);
  }

  return normalized;
}

function normalizeOptionalEmail(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (normalized && !emailRegex.test(normalized)) {
    throw new Error('O campo "contactEmail" precisa conter um e-mail válido.');
  }

  return normalized;
}

export function buildTenantSettingsUpdate(input: unknown): TenantSettingsUpdateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload de configurações inválido.");
  }

  const source = input as Record<string, unknown>;

  return {
    businessName: source.businessName === undefined ? undefined : normalizeRequiredString(source.businessName, "businessName"),
    displayName: source.displayName === undefined ? undefined : normalizeRequiredString(source.displayName, "displayName"),
    logoLabel: normalizeOptionalString(source.logoLabel),
    tagline: normalizeOptionalString(source.tagline),
    primaryColor: normalizeOptionalColor(source.primaryColor, "primaryColor"),
    secondaryColor: normalizeOptionalColor(source.secondaryColor, "secondaryColor"),
    contactEmail: normalizeOptionalEmail(source.contactEmail),
    contactPhone: normalizeOptionalString(source.contactPhone),
    documentCnpj: normalizeOptionalString(source.documentCnpj),
    addressLine1: normalizeOptionalString(source.addressLine1),
    addressLine2: normalizeOptionalString(source.addressLine2),
    addressDistrict: normalizeOptionalString(source.addressDistrict),
    addressCity: normalizeOptionalString(source.addressCity),
    addressState: normalizeOptionalString(source.addressState),
    addressZipCode: normalizeOptionalString(source.addressZipCode),
    stateRegistration: normalizeOptionalString(source.stateRegistration),
    municipalRegistration: normalizeOptionalString(source.municipalRegistration),
    taxRegime: normalizeOptionalString(source.taxRegime)
  };
}

export function tenantSettingsUpdateToRow(input: TenantSettingsUpdateInput): TenantSettingsUpdateRow {
  return {
    business_name: input.businessName,
    display_name: input.displayName,
    logo_label: input.logoLabel,
    tagline: input.tagline,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    document_cnpj: input.documentCnpj,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    address_district: input.addressDistrict,
    address_city: input.addressCity,
    address_state: input.addressState,
    address_zip_code: input.addressZipCode,
    state_registration: input.stateRegistration,
    municipal_registration: input.municipalRegistration,
    tax_regime: input.taxRegime
  };
}

export function tenantSettingsResponse(tenant: TenantStoreIdentity) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    businessName: tenant.businessName,
    displayName: tenant.displayName,
    logoLabel: tenant.logoLabel,
    tagline: tenant.tagline,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    documentCnpj: tenant.documentCnpj,
    addressLine1: tenant.addressLine1,
    addressLine2: tenant.addressLine2,
    addressDistrict: tenant.addressDistrict,
    addressCity: tenant.addressCity,
    addressState: tenant.addressState,
    addressZipCode: tenant.addressZipCode,
    stateRegistration: tenant.stateRegistration,
    municipalRegistration: tenant.municipalRegistration,
    taxRegime: tenant.taxRegime
  };
}
