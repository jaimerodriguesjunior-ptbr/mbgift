import "server-only";

import { createHash } from "node:crypto";

import type { FiscalImportPreview, FiscalImportPreviewItem, FiscalImportResolution, FiscalInvoiceDetail, FiscalMatchMode, FiscalProductMatch, ParsedFiscalItem } from "@/lib/fiscal/types";
import { parseNFeXml } from "@/lib/fiscal/xml";
import {
  createFiscalInvoice,
  createFiscalInvoiceItems,
  createProductFromFiscalImport,
  getFiscalInvoiceByAccessKey,
  getFiscalInvoiceDetailById,
  getFiscalInvoiceXmlById,
  listClientsForTenant,
  listFiscalInvoicesByTenant,
  listFiscalProductsForTenant,
  updateProductFromFiscalImport,
  type FiscalProductRow
} from "@/lib/fiscal/repository";
import { assertCanManageTenant, getCurrentTenantMembership } from "@/lib/tenants/membership";

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function toProductMatch(row: FiscalProductRow): FiscalProductMatch {
  return {
    id: row.id,
    name: row.name,
    ean: row.ean ?? "",
    stock: Number(row.stock_quantity ?? 0),
    price: Number(row.price ?? 0),
    category: row.category
  };
}

function buildSuggestedMatch(
  item: ParsedFiscalItem,
  products: FiscalProductRow[]
): Pick<FiscalImportPreviewItem, "matchedProduct" | "suggestedAction" | "suggestedMatchMode" | "lockedByEan" | "requiresApproval"> {
  const normalizedEan = item.ean?.trim();
  if (normalizedEan) {
    const eanMatches = products.filter((product) => product.ean?.trim() === normalizedEan);
    if (eanMatches.length === 1) {
      return {
        matchedProduct: toProductMatch(eanMatches[0]),
        suggestedAction: "update_existing",
        suggestedMatchMode: "auto_ean",
        lockedByEan: true,
        requiresApproval: false
      };
    }
  }

  const normalizedName = normalizeSearch(item.descricao);
  if (normalizedName) {
    const nameMatches = products.filter((product) => normalizeSearch(product.name) === normalizedName);
    if (nameMatches.length === 1) {
      return {
        matchedProduct: toProductMatch(nameMatches[0]),
        suggestedAction: "update_existing",
        suggestedMatchMode: "auto_name",
        lockedByEan: false,
        requiresApproval: true
      };
    }
  }

  return {
    matchedProduct: null,
    suggestedAction: "create_new",
    suggestedMatchMode: "none",
    lockedByEan: false,
    requiresApproval: false
  };
}

function buildPreview(
  document: ReturnType<typeof parseNFeXml>,
  duplicateInvoiceId: string | null,
  products: FiscalProductRow[]
): FiscalImportPreview {
  return {
    accessKey: document.accessKey,
    duplicateInvoiceId,
    document,
    items: document.items.map((item) => ({
      ...item,
      ...buildSuggestedMatch(item, products)
    }))
  };
}

function normalizeResolutionMap(preview: FiscalImportPreview, resolutions: FiscalImportResolution[] = []) {
  const resolutionMap = new Map(resolutions.map((resolution) => [resolution.sourceItemKey, resolution]));

  return preview.items.map((item) => {
    const provided = resolutionMap.get(item.sourceItemKey);
    if (!provided) {
      if (item.lockedByEan) {
        return {
          sourceItemKey: item.sourceItemKey,
          action: "update_existing" as const,
          productId: item.matchedProduct?.id ?? null,
          salePrice: item.matchedProduct?.price ?? null,
          updateName: false
        };
      }

      return {
        sourceItemKey: item.sourceItemKey,
        action: null,
        productId: item.matchedProduct?.id ?? null,
        salePrice: item.matchedProduct?.price ?? null,
        updateName: false
      };
    }

    return {
      sourceItemKey: item.sourceItemKey,
      action: provided.action,
      productId: provided.productId ?? null,
      salePrice: typeof provided.salePrice === "number" && Number.isFinite(provided.salePrice) ? provided.salePrice : null,
      updateName: Boolean(provided.updateName)
    };
  });
}

function inferMatchMode(
  item: FiscalImportPreviewItem,
  resolution: { action: string | null; productId: string | null }
): FiscalMatchMode {
  if (resolution.action === "unlinked") {
    return "none";
  }

  if (resolution.productId && item.matchedProduct?.id === resolution.productId) {
    return item.suggestedMatchMode;
  }

  if (resolution.productId) {
    return "manual";
  }

  return "none";
}

async function requireManageMembership() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  assertCanManageTenant(membership.role);
  return membership;
}

export async function previewCurrentTenantFiscalImport(xmlContent: string): Promise<FiscalImportPreview> {
  const membership = await requireManageMembership();
  const trimmedXml = xmlContent.trim();
  if (!trimmedXml) {
    throw new Error("O XML enviado esta vazio.");
  }

  const document = parseNFeXml(trimmedXml);
  if (document.documentType !== "NFe" || document.documentModel !== "55") {
    throw new Error("Esta versao aceita apenas XML de NF-e de entrada (modelo 55).");
  }

  const [products, duplicate] = await Promise.all([
    listFiscalProductsForTenant(membership.tenantId),
    getFiscalInvoiceByAccessKey(membership.tenantId, document.accessKey)
  ]);

  return buildPreview(document, duplicate?.id ?? null, products);
}

export async function commitCurrentTenantFiscalImport(input: {
  xmlContent: string;
  resolutions?: FiscalImportResolution[];
}) {
  const membership = await requireManageMembership();
  const preview = await previewCurrentTenantFiscalImport(input.xmlContent);

  if (preview.duplicateInvoiceId) {
    throw new Error("Esta nota ja foi importada anteriormente para este tenant.");
  }

  const xmlHash = createHash("sha256").update(input.xmlContent).digest("hex");
  const invoice = await createFiscalInvoice(
    membership.tenantId,
    preview.document,
    input.xmlContent,
    xmlHash
  );

  const products = await listFiscalProductsForTenant(membership.tenantId);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const normalizedResolutions = normalizeResolutionMap(preview, input.resolutions);

  const itemRecords: Parameters<typeof createFiscalInvoiceItems>[2] = [];
  let createdProducts = 0;
  let updatedProducts = 0;
  let unlinkedItems = 0;

  for (const item of preview.items) {
    const resolution = normalizedResolutions.find((entry) => entry.sourceItemKey === item.sourceItemKey);
    if (!resolution) {
      continue;
    }

    if (!resolution.action) {
      throw new Error(`O item "${item.descricao}" ainda precisa ser aprovado antes da importacao.`);
    }

    if (resolution.action === "update_existing") {
      if (!resolution.productId) {
        throw new Error(`O item "${item.descricao}" precisa de um produto vinculado para atualizar.`);
      }

      const currentProduct = productsById.get(resolution.productId);
      if (!currentProduct) {
        throw new Error(`O produto selecionado para "${item.descricao}" nao foi encontrado.`);
      }

      const persisted = await updateProductFromFiscalImport(membership.tenantId, resolution.productId, {
        currentRow: currentProduct,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        salePrice: resolution.salePrice ?? Number(currentProduct.price ?? 0),
        ean: item.ean,
        eanTributavel: item.eanTributavel,
        ncm: item.ncm,
        cest: item.cest,
        cfop: item.cfop,
        commercialUnit: item.commercialUnit,
        tributaryUnit: item.tributaryUnit,
        issueDate: preview.document.issueDate,
        updateName: resolution.updateName,
        name: item.descricao
      });

      productsById.set(persisted.id, {
        ...currentProduct,
        name: persisted.name,
        ean: persisted.ean,
        stock_quantity: persisted.stock_quantity,
        category: persisted.category
      });
      updatedProducts += 1;

      itemRecords.push({
        productId: persisted.id,
        sourceItemKey: item.sourceItemKey,
        lineNumber: item.lineNumber,
        actionTaken: "update_existing" as const,
        matchMode: inferMatchMode(item, resolution),
        codigo: item.codigo,
        ean: item.ean,
        descricao: item.descricao,
        ncm: item.ncm,
        cest: item.cest,
        cfop: item.cfop,
        commercialUnit: item.commercialUnit,
        tributaryUnit: item.tributaryUnit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountValue: item.discountValue,
        freightValue: item.freightValue,
        insuranceValue: item.insuranceValue,
        otherValue: item.otherValue,
        taxSnapshot: item.taxSnapshot,
        productSnapshot: {
          productId: persisted.id,
          productName: persisted.name,
          productEan: persisted.ean,
          stockAfterImport: persisted.stock_quantity,
          salePriceAfterImport: resolution.salePrice ?? Number(currentProduct.price ?? 0)
        }
      });
      continue;
    }

    if (resolution.action === "create_new") {
      const created = await createProductFromFiscalImport(membership.tenantId, {
        name: item.descricao,
        ean: item.ean,
        unitPrice: item.unitPrice,
        salePrice: resolution.salePrice ?? 0,
        quantity: item.quantity,
        ncm: item.ncm,
        cest: item.cest,
        cfop: item.cfop,
        commercialUnit: item.commercialUnit,
        tributaryUnit: item.tributaryUnit,
        eanTributavel: item.eanTributavel,
        issueDate: preview.document.issueDate
      });
      createdProducts += 1;

      itemRecords.push({
        productId: created.id,
        sourceItemKey: item.sourceItemKey,
        lineNumber: item.lineNumber,
        actionTaken: "create_new" as const,
        matchMode: inferMatchMode(item, resolution),
        codigo: item.codigo,
        ean: item.ean,
        descricao: item.descricao,
        ncm: item.ncm,
        cest: item.cest,
        cfop: item.cfop,
        commercialUnit: item.commercialUnit,
        tributaryUnit: item.tributaryUnit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountValue: item.discountValue,
        freightValue: item.freightValue,
        insuranceValue: item.insuranceValue,
        otherValue: item.otherValue,
        taxSnapshot: item.taxSnapshot,
        productSnapshot: {
          productId: created.id,
          productName: created.name,
          productEan: created.ean,
          stockAfterImport: created.stock_quantity,
          salePriceAfterImport: resolution.salePrice ?? 0
        }
      });
      continue;
    }

    unlinkedItems += 1;
    itemRecords.push({
      productId: null,
      sourceItemKey: item.sourceItemKey,
      lineNumber: item.lineNumber,
      actionTaken: "unlinked" as const,
      matchMode: "none" as const,
      codigo: item.codigo,
      ean: item.ean,
      descricao: item.descricao,
      ncm: item.ncm,
      cest: item.cest,
      cfop: item.cfop,
      commercialUnit: item.commercialUnit,
      tributaryUnit: item.tributaryUnit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      discountValue: item.discountValue,
      freightValue: item.freightValue,
      insuranceValue: item.insuranceValue,
      otherValue: item.otherValue,
      taxSnapshot: item.taxSnapshot,
      productSnapshot: {}
    });
  }

  await createFiscalInvoiceItems(membership.tenantId, invoice.id, itemRecords);

  return {
    invoiceId: invoice.id,
    createdProducts,
    updatedProducts,
    unlinkedItems
  };
}

export async function listCurrentTenantFiscalInvoices() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return listFiscalInvoicesByTenant(membership.tenantId);
}

export async function getCurrentTenantFiscalInvoice(invoiceId: string): Promise<FiscalInvoiceDetail | null> {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return getFiscalInvoiceDetailById(membership.tenantId, invoiceId);
}

export async function getCurrentTenantFiscalInvoiceXml(invoiceId: string) {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return getFiscalInvoiceXmlById(membership.tenantId, invoiceId);
}

export async function listCurrentTenantFiscalClients() {
  const membership = await getCurrentTenantMembership();
  if (!membership) {
    throw new Error("Usuario sem tenant associado.");
  }

  return listClientsForTenant(membership.tenantId);
}
