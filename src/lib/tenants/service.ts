import "server-only";

import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";
import { buildTenantSettingsUpdate, tenantSettingsUpdateToRow } from "@/lib/tenants/settings";
import { getTenantStoreIdentityById, updateTenantStoreIdentity } from "@/lib/tenants/repository";

export async function getCurrentTenantSettings() {
  const membership = await getCurrentTenantMembership();

  if (!membership) {
    return null;
  }

  return getTenantStoreIdentityById(membership.tenantId);
}

export async function updateCurrentTenantSettings(input: unknown) {
  const membership = await getCurrentTenantMembership();

  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const updatePayload = buildTenantSettingsUpdate(input);

  return updateTenantStoreIdentity(
    membership.tenantId,
    tenantSettingsUpdateToRow(updatePayload)
  );
}
