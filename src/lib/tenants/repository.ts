import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TenantStoreIdentity } from "@/lib/tenants/types";

const TENANT_SETTINGS_COLUMNS = `
  id,
  slug,
  business_name,
  display_name,
  logo_label,
  logo_url,
  tagline,
  primary_color,
  secondary_color,
  contact_email,
  contact_phone,
  document_cnpj,
  address_line1,
  address_line2,
  address_district,
  address_city,
  address_state,
  address_zip_code,
  state_registration,
  municipal_registration,
  tax_regime
`;

type TenantRow = {
  id: string;
  slug: string;
  business_name: string;
  display_name: string;
  logo_label: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  document_cnpj: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip_code: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  tax_regime: string | null;
};

type TenantUpdateRow = Partial<Omit<TenantRow, "id" | "slug">>;

function mapTenantRow(row: TenantRow): TenantStoreIdentity {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    displayName: row.display_name,
    logoLabel: row.logo_label,
    logoUrl: row.logo_url,
    tagline: row.tagline,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    documentCnpj: row.document_cnpj,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    addressDistrict: row.address_district,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressZipCode: row.address_zip_code,
    stateRegistration: row.state_registration,
    municipalRegistration: row.municipal_registration,
    taxRegime: row.tax_regime
  };
}

export async function getTenantStoreIdentityBySlug(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SETTINGS_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar tenant por slug: ${error.message}`);
  }

  return data ? mapTenantRow(data as TenantRow) : null;
}

export async function getTenantStoreIdentityBySlugAdmin(slug: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SETTINGS_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar tenant por slug no modo admin: ${error.message}`);
  }

  return data ? mapTenantRow(data as TenantRow) : null;
}

export async function getSingleTenantStoreIdentityAdmin() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SETTINGS_COLUMNS)
    .limit(2);

  if (error) {
    throw new Error(`Falha ao carregar tenant unico no modo admin: ${error.message}`);
  }

  if (!data || data.length !== 1) {
    return null;
  }

  return mapTenantRow(data[0] as TenantRow);
}

export async function getTenantStoreIdentityById(tenantId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SETTINGS_COLUMNS)
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar tenant por id: ${error.message}`);
  }

  return data ? mapTenantRow(data as TenantRow) : null;
}

export async function getTenantStoreIdentityByIdAdmin(tenantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SETTINGS_COLUMNS)
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar tenant por id no modo admin: ${error.message}`);
  }

  return data ? mapTenantRow(data as TenantRow) : null;
}

export async function updateTenantStoreIdentity(tenantId: string, values: TenantUpdateRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .update(values)
    .eq("id", tenantId)
    .select(TENANT_SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao atualizar tenant: ${error.message}`);
  }

  return data ? mapTenantRow(data as TenantRow) : null;
}
