import { XMLParser } from "fast-xml-parser";

import type {
  FiscalParty,
  FiscalPartyAddress,
  ParsedFiscalDocument,
  ParsedFiscalItem,
  ParsedFiscalTotals
} from "@/lib/fiscal/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true
});

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeText(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDocument(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits || normalized;
}

function deriveDocumentType(model: string | null): ParsedFiscalDocument["documentType"] {
  if (model === "65") {
    return "NFCe";
  }

  if (model === "58") {
    return "NFSe";
  }

  return "NFe";
}

function buildAddress(data: Record<string, unknown> | null | undefined): FiscalPartyAddress | null {
  if (!data) {
    return null;
  }

  return {
    street: normalizeText(data.xLgr),
    number: normalizeText(data.nro),
    complement: normalizeText(data.xCpl),
    district: normalizeText(data.xBairro),
    city: normalizeText(data.xMun),
    state: normalizeText(data.UF),
    cityCode: normalizeText(data.cMun),
    zipCode: normalizeDocument(data.CEP),
    country: normalizeText(data.xPais),
    phone: normalizeDocument(data.fone)
  };
}

function buildParty(
  data: Record<string, unknown> | null | undefined,
  addressKey: "enderEmit" | "enderDest"
): FiscalParty | null {
  if (!data) {
    return null;
  }

  return {
    name: normalizeText(data.xNome),
    document: normalizeDocument(data.CNPJ || data.CPF || data.idEstrangeiro),
    stateRegistration: normalizeText(data.IE),
    email: normalizeText(data.email),
    address: buildAddress((data[addressKey] as Record<string, unknown> | undefined) ?? null)
  };
}

function buildTotals(data: Record<string, unknown> | null | undefined): ParsedFiscalTotals {
  return {
    products: toNumber(data?.vProd),
    discount: toNumber(data?.vDesc),
    freight: toNumber(data?.vFrete),
    insurance: toNumber(data?.vSeg),
    other: toNumber(data?.vOutro),
    invoice: toNumber(data?.vNF)
  };
}

function resolveAccessKey(parsedXml: Record<string, any>, infNFe: Record<string, any>) {
  const fromId = normalizeDocument(
    String(infNFe?.["@_Id"] ?? infNFe?.Id ?? "").replace(/^NFe/, "")
  );
  const fromProtocol = normalizeDocument(parsedXml?.nfeProc?.protNFe?.infProt?.chNFe);

  return fromId || fromProtocol;
}

export function parseNFeXml(xmlContent: string): ParsedFiscalDocument {
  const xml = parser.parse(xmlContent) as Record<string, any>;
  const infNFe =
    xml?.nfeProc?.NFe?.infNFe ||
    xml?.NFe?.infNFe ||
    xml?.infNFe;

  if (!infNFe) {
    throw new Error("XML invalido ou formato de NF-e nao suportado.");
  }

  const ide = (infNFe.ide ?? {}) as Record<string, unknown>;
  const total = (infNFe.total?.ICMSTot ?? {}) as Record<string, unknown>;
  const accessKey = resolveAccessKey(xml, infNFe);

  if (!accessKey) {
    throw new Error("Nao foi possivel identificar a chave de acesso da nota.");
  }

  const items = asArray(infNFe.det).map((item: Record<string, any>, index) => {
    const prod = (item.prod ?? {}) as Record<string, unknown>;

    return {
      sourceItemKey: normalizeText(item?.["@_nItem"]) || String(index + 1),
      lineNumber: index + 1,
      codigo: normalizeText(prod.cProd) || String(index + 1),
      ean: normalizeText(prod.cEAN) === "SEM GTIN" ? null : normalizeText(prod.cEAN),
      eanTributavel: normalizeText(prod.cEANTrib) === "SEM GTIN" ? null : normalizeText(prod.cEANTrib),
      descricao: normalizeText(prod.xProd) || `Item ${index + 1}`,
      ncm: normalizeText(prod.NCM),
      cest: normalizeText(prod.CEST),
      cfop: normalizeText(prod.CFOP),
      commercialUnit: normalizeText(prod.uCom),
      tributaryUnit: normalizeText(prod.uTrib),
      quantity: toNumber(prod.qCom),
      unitPrice: toNumber(prod.vUnCom),
      totalPrice: toNumber(prod.vProd),
      discountValue: toNumber(prod.vDesc),
      freightValue: toNumber(prod.vFrete),
      insuranceValue: toNumber(prod.vSeg),
      otherValue: toNumber(prod.vOutro),
      taxSnapshot: (item.imposto ?? {}) as Record<string, unknown>
    } satisfies ParsedFiscalItem;
  });

  return {
    accessKey,
    number: normalizeText(ide.nNF),
    series: normalizeText(ide.serie),
    issueDate: normalizeText(ide.dhEmi) || normalizeText(ide.dEmi) || new Date().toISOString(),
    environment: normalizeText(ide.tpAmb) === "2" ? "homologation" : "production",
    documentModel: normalizeText(ide.mod),
    documentType: deriveDocumentType(normalizeText(ide.mod)),
    natureOperation: normalizeText(ide.natOp),
    issuer: buildParty((infNFe.emit ?? null) as Record<string, unknown> | null, "enderEmit") ?? {
      name: null,
      document: null,
      stateRegistration: null,
      email: null,
      address: null
    },
    recipient: buildParty((infNFe.dest ?? null) as Record<string, unknown> | null, "enderDest"),
    totals: buildTotals(total),
    items
  };
}
