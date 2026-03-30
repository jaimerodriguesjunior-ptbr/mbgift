import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantMembership = {
  id: string;
  tenantId: string;
  profileId: string;
  role: "owner" | "admin" | "manager" | "staff";
};

type MembershipRow = {
  id: string;
  tenant_id: string;
  profile_id: string;
  role: "owner" | "admin" | "manager" | "staff";
};

function mapMembershipRow(row: MembershipRow): TenantMembership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    profileId: row.profile_id,
    role: row.role
  };
}

function isRecoverableAuthError(message: string) {
  return /auth session missing|session missing|jwt expired|refresh token/i.test(message);
}

export async function getCurrentUserMemberships() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    if (isRecoverableAuthError(authError.message)) {
      return [];
    }

    throw new Error(`Falha ao validar usuario autenticado: ${authError.message}`);
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, profile_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar memberships do usuario: ${error.message}`);
  }

  return (data ?? []).map((entry) => mapMembershipRow(entry as MembershipRow));
}

export async function getCurrentTenantMembership() {
  const memberships = await getCurrentUserMemberships();

  if (memberships.length > 1) {
    throw new Error("Usuario com mais de um tenant associado ainda nao e suportado neste MVP.");
  }

  return memberships[0] ?? null;
}

export function assertCanManageTenant(role: TenantMembership["role"]) {
  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("Usuario sem permissao para alterar as configuracoes do tenant.");
  }
}
