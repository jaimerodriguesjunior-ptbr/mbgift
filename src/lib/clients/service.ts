import "server-only";

import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";
import { buildClientWriteInput, clientInputToInsertRow, clientInputToUpdateRow } from "@/lib/clients/inputs";
import { createClient, deleteClient, getClientById, getClientUsageCounts, listClientsByTenant, updateClient } from "@/lib/clients/repository";

export async function listCurrentTenantClients(query?: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  return listClientsByTenant(membership.tenantId, query);
}

export async function getCurrentTenantClient(clientId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  return getClientById(membership.tenantId, clientId);
}

export async function createCurrentTenantClient(input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const clientInput = buildClientWriteInput(input, "create");
  return createClient(membership.tenantId, clientInputToInsertRow(membership.tenantId, clientInput));
}

export async function updateCurrentTenantClient(clientId: string, input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const clientInput = buildClientWriteInput(input, "update");
  return updateClient(membership.tenantId, clientId, clientInputToUpdateRow(clientInput));
}

export async function deleteCurrentTenantClient(clientId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuário sem tenant associado.");
  }

  assertCanManageTenant(membership.role);

  const client = await getClientById(membership.tenantId, clientId);
  if (!client) {
    return null;
  }

  const usage = await getClientUsageCounts(membership.tenantId, clientId);
  if (usage.hasReferences) {
    throw new Error("Este cliente não pode ser excluído porque já possui vendas ou condicionais.");
  }

  await deleteClient(membership.tenantId, clientId);

  return {
    clientId,
    usage
  };
}
