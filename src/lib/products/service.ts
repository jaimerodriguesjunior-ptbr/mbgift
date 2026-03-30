import "server-only";

import { buildProductWriteInput, productInputToInsertRow, productInputToUpdateRow } from "@/lib/products/inputs";
import {
  createProduct,
  getProductById,
  getProductUsageSummary,
  hardDeleteProduct,
  listProductsByTenant,
  softDeleteProduct,
  updateProduct
} from "@/lib/products/repository";
import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";

export async function listCurrentTenantProducts(query?: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return listProductsByTenant(membership.tenantId, query);
}

export async function getCurrentTenantProduct(productId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return getProductById(membership.tenantId, productId);
}

export async function createCurrentTenantProduct(input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const productInput = buildProductWriteInput(input, "create");
  return createProduct(membership.tenantId, productInputToInsertRow(membership.tenantId, productInput));
}

export async function updateCurrentTenantProduct(productId: string, input: unknown) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  const productInput = buildProductWriteInput(input, "update");
  return updateProduct(membership.tenantId, productId, productInputToUpdateRow(productInput));
}

export async function deleteCurrentTenantProduct(productId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  assertCanManageTenant(membership.role);

  const product = await getProductById(membership.tenantId, productId);
  if (!product) {
    return null;
  }

  const usage = await getProductUsageSummary(membership.tenantId, productId);

  if (usage.hasReferences) {
    await softDeleteProduct(membership.tenantId, productId);
    return {
      mode: "soft" as const,
      productId,
      usage
    };
  }

  await hardDeleteProduct(membership.tenantId, productId);
  return {
    mode: "hard" as const,
    productId,
    usage
  };
}
