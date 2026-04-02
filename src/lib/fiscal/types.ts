export type FiscalPartyAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  cityCode: string | null;
  zipCode: string | null;
  country: string | null;
  phone: string | null;
};

export type FiscalParty = {
  name: string | null;
  document: string | null;
  stateRegistration: string | null;
  email: string | null;
  address: FiscalPartyAddress | null;
};

export type ParsedFiscalTotals = {
  products: number;
  discount: number;
  freight: number;
  insurance: number;
  other: number;
  invoice: number;
};

export type ParsedFiscalItem = {
  sourceItemKey: string;
  lineNumber: number;
  codigo: string;
  ean: string | null;
  eanTributavel: string | null;
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
};

export type ParsedFiscalDocument = {
  accessKey: string;
  number: string | null;
  series: string | null;
  issueDate: string;
  environment: "production" | "homologation";
  documentModel: string | null;
  documentType: "NFe" | "NFCe" | "NFSe";
  natureOperation: string | null;
  issuer: FiscalParty;
  recipient: FiscalParty | null;
  totals: ParsedFiscalTotals;
  items: ParsedFiscalItem[];
};

export type FiscalMatchMode = "auto_ean" | "auto_name" | "manual" | "none";
export type FiscalImportAction = "update_existing" | "create_new" | "unlinked";

export type FiscalProductMatch = {
  id: string;
  name: string;
  ean: string;
  stock: number;
  price: number;
  category: string;
};

export type FiscalImportPreviewItem = ParsedFiscalItem & {
  matchedProduct: FiscalProductMatch | null;
  suggestedAction: FiscalImportAction;
  suggestedMatchMode: FiscalMatchMode;
  lockedByEan: boolean;
  requiresApproval: boolean;
};

export type FiscalImportPreview = {
  accessKey: string;
  duplicateInvoiceId: string | null;
  document: ParsedFiscalDocument;
  items: FiscalImportPreviewItem[];
};

export type FiscalImportResolution = {
  sourceItemKey: string;
  action: FiscalImportAction;
  productId?: string | null;
  salePrice?: number | null;
  updateName?: boolean;
};

export type FiscalInvoiceSummary = {
  id: string;
  accessKey: string;
  number: string | null;
  series: string | null;
  issueDate: string | null;
  entryDate: string;
  status: string;
  direction: "entry" | "output";
  documentType: string;
  environment: "production" | "homologation" | null;
  totalInvoiceAmount: number;
  issuerName: string | null;
  recipientName: string | null;
  itemCount: number;
};

export type FiscalInvoiceItemRecord = {
  id: string;
  productId: string | null;
  sourceItemKey: string;
  lineNumber: number;
  actionTaken: FiscalImportAction;
  matchMode: FiscalMatchMode;
  codigo: string | null;
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
};

export type FiscalInvoiceDetail = FiscalInvoiceSummary & {
  xmlContent: string;
  xmlHash: string;
  documentModel: string | null;
  natureOperation: string | null;
  relatedInvoiceId: string | null;
  errorMessage: string | null;
  totals: ParsedFiscalTotals;
  issuerDocument: string | null;
  issuerStateRegistration: string | null;
  issuerEmail: string | null;
  issuerSnapshot: Record<string, unknown>;
  recipientDocument: string | null;
  recipientStateRegistration: string | null;
  recipientEmail: string | null;
  recipientSnapshot: Record<string, unknown>;
  items: FiscalInvoiceItemRecord[];
};
