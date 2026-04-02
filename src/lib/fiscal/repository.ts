import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  FiscalImportAction,
  FiscalInvoiceDetail,
  FiscalInvoiceItemRecord,
  FiscalInvoiceSummary,
  FiscalMatchMode,
  ParsedFiscalDocument,
  ParsedFiscalTotals
} from "@/lib/fiscal/types";

type FiscalInvoiceRow = {
  id: string;
  tenant_id: string;
  related_invoice_id: string | null;
  direction: "entry" | "output";
  document_type: string;
  document_model: string | null;
  status: string;
  environment: "production" | "homologation" | null;
  access_key: string;
  xml_content: string;
  xml_hash: string;
  number: string | null;
  series: string | null;
  issue_date: string | null;
  entry_date: string;
  nature_operation: string | null;
  total_products_amount: number | string | null;
  total_discount_amount: number | string | null;
  total_freight_amount: number | string | null;
  total_insurance_amount: number | string | null;
  total_other_amount: number | string | null;
  total_invoice_amount: number | string | null;
  issuer_name: string | null;
  issuer_document: string | null;
  issuer_state_registration: string | null;
  issuer_email: string | null;
  issuer_snapshot: Record<string, unknown> | null;
  recipient_name: string | null;
  recipient_document: string | null;
  recipient_state_registration: string | null;
  recipient_email: string | null;
  recipient_snapshot: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type FiscalInvoiceItemRow = {
  id: string;
  product_id: string | null;
  source_item_key: string;
  line_number: number;
  action_taken: FiscalImportAction;
  match_mode: FiscalMatchMode;
  codigo: string | null;
  ean: string | null;
  descricao: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  commercial_unit: string | null;
  tributary_unit: string | null;
  quantity: number | string;
  unit_price: number | string;
  total_price: number | string;
  discount_value: number | string | null;
  freight_value: number | string | null;
  insurance_value: number | string | null;
  other_value: number | string | null;
  tax_snapshot: Record<string, unknown> | null;
  product_snapshot: Record<string, unknown> | null;
};

export type FiscalProductRow = {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  ean: string | null;
  price: number | string;
  stock_quantity: number;
  sku: string | null;
  brand: string | null;
  cost_price: number | string | null;
  last_purchase_price: number | string | null;
  last_purchase_at: string | null;
  ean_tributavel: string | null;
  commercial_unit: string | null;
  tributary_unit: string | null;
  tributary_factor: number | string | null;
  ncm: string | null;
  cest: string | null;
  origin_code: string | null;
  cfop_entry_default: string | null;
  cfop_sale_default: string | null;
  cfop_return_default: string | null;
  icms_code: string | null;
  pis_cst: string | null;
  cofins_cst: string | null;
  ipi_cst: string | null;
  ipi_enq: string | null;
  anp_code: string | null;
  benefit_code: string | null;
  fiscal_notes: string | null;
};

type FiscalClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  photo_url: string | null;
  cpf: string | null;
  address_text: string | null;
  address_zip_code: string | null;
  address_line1: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_ibge_code: string | null;
  state_registration: string | null;
  taxpayer_indicator: string | null;
  is_trusted: boolean;
};

const FISCAL_INVOICE_COLUMNS = `
  id,
  tenant_id,
  related_invoice_id,
  direction,
  document_type,
  document_model,
  status,
  environment,
  access_key,
  xml_content,
  xml_hash,
  number,
  series,
  issue_date,
  entry_date,
  nature_operation,
  total_products_amount,
  total_discount_amount,
  total_freight_amount,
  total_insurance_amount,
  total_other_amount,
  total_invoice_amount,
  issuer_name,
  issuer_document,
  issuer_state_registration,
  issuer_email,
  issuer_snapshot,
  recipient_name,
  recipient_document,
  recipient_state_registration,
  recipient_email,
  recipient_snapshot,
  error_message,
  created_at,
  updated_at
`;

function formatFiscalRepositoryError(message: string) {
  if (
    /Could not find the table 'public\.fiscal_invoices'|Could not find the table 'public\.fiscal_invoice_items'|schema cache/i.test(message) ||
    /column .* does not exist/i.test(message)
  ) {
    return "As migrations fiscais ainda nao foram aplicadas neste banco. Execute a migration supabase/migrations/20260401_000005_fiscal_import_foundation.sql e recarregue a pagina.";
  }

  return message;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapTotals(row: FiscalInvoiceRow): ParsedFiscalTotals {
  return {
    products: toNumber(row.total_products_amount),
    discount: toNumber(row.total_discount_amount),
    freight: toNumber(row.total_freight_amount),
    insurance: toNumber(row.total_insurance_amount),
    other: toNumber(row.total_other_amount),
    invoice: toNumber(row.total_invoice_amount)
  };
}

function mapInvoiceSummary(row: FiscalInvoiceRow, itemCount = 0): FiscalInvoiceSummary {
  return {
    id: row.id,
    accessKey: row.access_key,
    number: row.number,
    series: row.series,
    issueDate: row.issue_date,
    entryDate: row.entry_date,
    status: row.status,
    direction: row.direction,
    documentType: row.document_type,
    environment: row.environment,
    totalInvoiceAmount: toNumber(row.total_invoice_amount),
    issuerName: row.issuer_name,
    recipientName: row.recipient_name,
    itemCount
  };
}

function mapInvoiceItem(row: FiscalInvoiceItemRow): FiscalInvoiceItemRecord {
  return {
    id: row.id,
    productId: row.product_id,
    sourceItemKey: row.source_item_key,
    lineNumber: row.line_number,
    actionTaken: row.action_taken,
    matchMode: row.match_mode,
    codigo: row.codigo,
    ean: row.ean,
    descricao: row.descricao,
    ncm: row.ncm,
    cest: row.cest,
    cfop: row.cfop,
    commercialUnit: row.commercial_unit,
    tributaryUnit: row.tributary_unit,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    totalPrice: toNumber(row.total_price),
    discountValue: toNumber(row.discount_value),
    freightValue: toNumber(row.freight_value),
    insuranceValue: toNumber(row.insurance_value),
    otherValue: toNumber(row.other_value),
    taxSnapshot: row.tax_snapshot ?? {},
    productSnapshot: row.product_snapshot ?? {}
  };
}

export async function listFiscalProductsForTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      tenant_id,
      name,
      category,
      ean,
      price,
      stock_quantity,
      sku,
      brand,
      cost_price,
      last_purchase_price,
      last_purchase_at,
      ean_tributavel,
      commercial_unit,
      tributary_unit,
      tributary_factor,
      ncm,
      cest,
      origin_code,
      cfop_entry_default,
      cfop_sale_default,
      cfop_return_default,
      icms_code,
      pis_cst,
      cofins_cst,
      ipi_cst,
      ipi_enq,
      anp_code,
      benefit_code,
      fiscal_notes
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar produtos fiscais: ${formatFiscalRepositoryError(error.message)}`);
  }

  return (data ?? []) as FiscalProductRow[];
}

export async function getFiscalInvoiceByAccessKey(tenantId: string, accessKey: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("fiscal_invoices")
    .select(FISCAL_INVOICE_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("access_key", accessKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar nota fiscal por chave: ${formatFiscalRepositoryError(error.message)}`);
  }

  return data ? (data as FiscalInvoiceRow) : null;
}

export async function createFiscalInvoice(
  tenantId: string,
  document: ParsedFiscalDocument,
  xmlContent: string,
  xmlHash: string
) {
  const supabase = getSupabaseAdminClient();
  const admin = supabase as any;
  const { data, error } = await admin
    .from("fiscal_invoices")
    .insert({
      tenant_id: tenantId,
      direction: "entry",
      document_type: document.documentType,
      document_model: document.documentModel,
      operation_kind: "purchase_import",
      status: "authorized",
      environment: document.environment,
      access_key: document.accessKey,
      xml_content: xmlContent,
      xml_hash: xmlHash,
      number: document.number,
      series: document.series,
      issue_date: document.issueDate,
      entry_date: new Date().toISOString(),
      nature_operation: document.natureOperation,
      total_products_amount: document.totals.products,
      total_discount_amount: document.totals.discount,
      total_freight_amount: document.totals.freight,
      total_insurance_amount: document.totals.insurance,
      total_other_amount: document.totals.other,
      total_invoice_amount: document.totals.invoice,
      issuer_name: document.issuer.name,
      issuer_document: document.issuer.document,
      issuer_state_registration: document.issuer.stateRegistration,
      issuer_email: document.issuer.email,
      issuer_snapshot: document.issuer,
      recipient_name: document.recipient?.name ?? null,
      recipient_document: document.recipient?.document ?? null,
      recipient_state_registration: document.recipient?.stateRegistration ?? null,
      recipient_email: document.recipient?.email ?? null,
      recipient_snapshot: document.recipient ?? {},
      error_message: null
    })
    .select(FISCAL_INVOICE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Falha ao criar nota fiscal: ${formatFiscalRepositoryError(error.message)}`);
  }

  return data as FiscalInvoiceRow;
}

export async function createFiscalInvoiceItems(
  tenantId: string,
  invoiceId: string,
  values: Array<{
    productId: string | null;
    sourceItemKey: string;
    lineNumber: number;
    actionTaken: FiscalImportAction;
    matchMode: FiscalMatchMode;
    codigo: string;
    ean: string | null;
    descricao: string;
    ncm: string | null;
    cest: string | null;
    cfop: string | null;
    commercialUnit: string | null;
    tributaryUnit: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountValue: number;
    freightValue: number;
    insuranceValue: number;
    otherValue: number;
    taxSnapshot: Record<string, unknown>;
    productSnapshot: Record<string, unknown>;
  }>
) {
  const supabase = getSupabaseAdminClient();
  const admin = supabase as any;
  const { error } = await admin
    .from("fiscal_invoice_items")
    .insert(
      values.map((value) => ({
        tenant_id: tenantId,
        invoice_id: invoiceId,
        product_id: value.productId,
        source_item_key: value.sourceItemKey,
        line_number: value.lineNumber,
        action_taken: value.actionTaken,
        match_mode: value.matchMode,
        codigo: value.codigo,
        ean: value.ean,
        descricao: value.descricao,
        ncm: value.ncm,
        cest: value.cest,
        cfop: value.cfop,
        commercial_unit: value.commercialUnit,
        tributary_unit: value.tributaryUnit,
        quantity: value.quantity,
        unit_price: value.unitPrice,
        total_price: value.totalPrice,
        discount_value: value.discountValue,
        freight_value: value.freightValue,
        insurance_value: value.insuranceValue,
        other_value: value.otherValue,
        tax_snapshot: value.taxSnapshot,
        product_snapshot: value.productSnapshot
      }))
    );

  if (error) {
    throw new Error(`Falha ao criar itens da nota fiscal: ${formatFiscalRepositoryError(error.message)}`);
  }
}

export async function createProductFromFiscalImport(
  tenantId: string,
  value: {
    name: string;
    ean: string | null;
    unitPrice: number;
    salePrice: number;
    quantity: number;
    ncm: string | null;
    cest: string | null;
    cfop: string | null;
    commercialUnit: string | null;
    tributaryUnit: string | null;
    eanTributavel: string | null;
    issueDate: string;
  }
) {
  const supabase = getSupabaseAdminClient();
  const admin = supabase as any;
  const { data, error } = await admin
    .from("products")
    .insert({
      tenant_id: tenantId,
      name: value.name,
      category: "Geral",
      ean: value.ean,
      price: value.salePrice,
      stock_quantity: Math.max(0, Math.round(value.quantity)),
      image_urls: [],
      main_image_index: 0,
      is_draft: false,
      cost_price: value.unitPrice,
      last_purchase_price: value.unitPrice,
      last_purchase_at: value.issueDate,
      ean_tributavel: value.eanTributavel,
      commercial_unit: value.commercialUnit,
      tributary_unit: value.tributaryUnit,
      ncm: value.ncm,
      cest: value.cest,
      cfop_entry_default: value.cfop
    })
    .select("id, name, ean, stock_quantity, category")
    .single();

  if (error) {
    throw new Error(`Falha ao criar produto pela importacao fiscal: ${formatFiscalRepositoryError(error.message)}`);
  }

  return data as {
    id: string;
    name: string;
    ean: string | null;
    stock_quantity: number;
    category: string;
  };
}

export async function updateProductFromFiscalImport(
  tenantId: string,
  productId: string,
  value: {
    currentRow: FiscalProductRow;
    quantity: number;
    unitPrice: number;
    salePrice: number;
    ean: string | null;
    eanTributavel: string | null;
    ncm: string | null;
    cest: string | null;
    cfop: string | null;
    commercialUnit: string | null;
    tributaryUnit: string | null;
    issueDate: string;
    updateName: boolean;
    name: string;
  }
) {
  const supabase = getSupabaseAdminClient();
  const admin = supabase as any;
  const nextStock = Math.max(0, Number(value.currentRow.stock_quantity ?? 0) + Math.round(value.quantity));
  const updatePayload: Record<string, unknown> = {
    stock_quantity: nextStock,
    price: value.salePrice,
    cost_price: value.unitPrice,
    last_purchase_price: value.unitPrice,
    last_purchase_at: value.issueDate
  };

  if (!value.currentRow.ean && value.ean) {
    updatePayload.ean = value.ean;
  }

  if (!value.currentRow.ean_tributavel && value.eanTributavel) {
    updatePayload.ean_tributavel = value.eanTributavel;
  }

  if (!value.currentRow.ncm && value.ncm) {
    updatePayload.ncm = value.ncm;
  }

  if (!value.currentRow.cest && value.cest) {
    updatePayload.cest = value.cest;
  }

  if (!value.currentRow.cfop_entry_default && value.cfop) {
    updatePayload.cfop_entry_default = value.cfop;
  }

  if (!value.currentRow.commercial_unit && value.commercialUnit) {
    updatePayload.commercial_unit = value.commercialUnit;
  }

  if (!value.currentRow.tributary_unit && value.tributaryUnit) {
    updatePayload.tributary_unit = value.tributaryUnit;
  }

  if (value.updateName) {
    updatePayload.name = value.name;
  }

  const { data, error } = await admin
    .from("products")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .eq("id", productId)
    .select("id, name, ean, stock_quantity, category")
    .single();

  if (error) {
    throw new Error(`Falha ao atualizar produto pela importacao fiscal: ${formatFiscalRepositoryError(error.message)}`);
  }

  return data as {
    id: string;
    name: string;
    ean: string | null;
    stock_quantity: number;
    category: string;
  };
}

export async function listFiscalInvoicesByTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("fiscal_invoices")
    .select(`${FISCAL_INVOICE_COLUMNS}, fiscal_invoice_items(id)`)
    .eq("tenant_id", tenantId)
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar notas fiscais: ${formatFiscalRepositoryError(error.message)}`);
  }

  return (data ?? []).map((entry: any) =>
    mapInvoiceSummary(entry as FiscalInvoiceRow, Array.isArray(entry.fiscal_invoice_items) ? entry.fiscal_invoice_items.length : 0)
  );
}

export async function getFiscalInvoiceDetailById(tenantId: string, invoiceId: string): Promise<FiscalInvoiceDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("fiscal_invoices")
    .select(FISCAL_INVOICE_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar detalhe da nota fiscal: ${formatFiscalRepositoryError(error.message)}`);
  }

  if (!data) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("fiscal_invoice_items")
    .select(`
      id,
      product_id,
      source_item_key,
      line_number,
      action_taken,
      match_mode,
      codigo,
      ean,
      descricao,
      ncm,
      cest,
      cfop,
      commercial_unit,
      tributary_unit,
      quantity,
      unit_price,
      total_price,
      discount_value,
      freight_value,
      insurance_value,
      other_value,
      tax_snapshot,
      product_snapshot
    `)
    .eq("tenant_id", tenantId)
    .eq("invoice_id", invoiceId)
    .order("line_number", { ascending: true });

  if (itemsError) {
    throw new Error(`Falha ao carregar itens da nota fiscal: ${formatFiscalRepositoryError(itemsError.message)}`);
  }

  const row = data as FiscalInvoiceRow;
  return {
    ...mapInvoiceSummary(row, (items ?? []).length),
    xmlContent: row.xml_content,
    xmlHash: row.xml_hash,
    documentModel: row.document_model,
    natureOperation: row.nature_operation,
    relatedInvoiceId: row.related_invoice_id,
    errorMessage: row.error_message,
    totals: mapTotals(row),
    issuerDocument: row.issuer_document,
    issuerStateRegistration: row.issuer_state_registration,
    issuerEmail: row.issuer_email,
    issuerSnapshot: row.issuer_snapshot ?? {},
    recipientDocument: row.recipient_document,
    recipientStateRegistration: row.recipient_state_registration,
    recipientEmail: row.recipient_email,
    recipientSnapshot: row.recipient_snapshot ?? {},
    items: (items ?? []).map((item) => mapInvoiceItem(item as FiscalInvoiceItemRow))
  };
}

export async function getFiscalInvoiceXmlById(tenantId: string, invoiceId: string) {
  const detail = await getFiscalInvoiceDetailById(tenantId, invoiceId);
  if (!detail) {
    return null;
  }

  return {
    accessKey: detail.accessKey,
    number: detail.number,
    xmlContent: detail.xmlContent
  };
}

export async function listClientsForTenant(tenantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select(`
      id,
      tenant_id,
      name,
      phone,
      email,
      instagram,
      photo_url,
      cpf,
      address_text,
      address_zip_code,
      address_line1,
      address_number,
      address_complement,
      address_district,
      address_city,
      address_state,
      address_ibge_code,
      state_registration,
      taxpayer_indicator,
      is_trusted
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar clientes fiscais: ${formatFiscalRepositoryError(error.message)}`);
  }

  return (data ?? []) as FiscalClientRow[];
}
