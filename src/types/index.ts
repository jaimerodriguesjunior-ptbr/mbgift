// src/types/index.ts

export type GiftItemStatus = "disponivel" | "reservado" | "comprado";

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  mainImageIndex: number;
  category: string;
  ean: string;
  isDraft?: boolean;
  isDeleted?: boolean;
  draftOrigin?: "manual" | "cosmos";
  tenant_id?: string;
};

export type GiftListItem = {
  id: string;
  productId: string;
  note: string;
  status: GiftItemStatus;
  guestName?: string;
  guestMessage?: string;
};

export type GiftList = {
  id: string;
  slug: string;
  brideName: string;
  eventDate: string;
  photo: string;
  city: string;
  headline: string;
  items: GiftListItem[];
  tenant_id?: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  instagram: string;
  photo?: string;
  cpf?: string;
  address?: string;
  isTrusted?: boolean;
  tenant_id?: string;
};

export type CashMove = {
  id: string;
  type: "entrada" | "saida";
  title: string;
  amount: number;
  date: string;
  tenant_id?: string;
};

export type Tenant = {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  logoLabel: string;
  primaryColor: string;
  secondaryColor: string;
  fontSerif: string;
  fontSans: string;
};

// Payment & Sales
export type StorePaymentMethod = "credito" | "debito" | "pix" | "dinheiro" | "boleto";

export type StorePaymentEntry = {
  method: StorePaymentMethod;
  amount: number;
};

export type SaleItemRecord = {
  productId: string;
  qty: number;
  unitPrice: number;
  sourceType: SaleItemOrigin;
  giftListItemId?: string;
};

export type SaleRecord = {
  id: string;
  total: number;
  payments: StorePaymentEntry[];
  items: SaleItemRecord[];
  time: string;
  clientId?: string;
  clientName?: string;
  cpf?: string;
  originType: "direct" | "conditional";
  originId?: string;
  canceledAt?: string;
  tenant_id?: string;
};

export type SaleItemOrigin = "direct" | "conditional";

// Conditional Sales
export type ConditionalStatus =
  | "open"
  | "converted_full"
  | "converted_partial"
  | "returned_full"
  | "canceled"
  | "due_today" // Derived state, but useful in some contexts
  | "late";      // Derived state

export type ConditionalItem = {
  productId: string;
  qtySent: number;
  qtySold: number;
  qtyReturned: number;
  unitPrice: number;
};

export type ConditionalRecord = {
  id: string;
  clientId: string;
  status: ConditionalStatus;
  openedAt: string;
  dueDate: string;
  receiptPrintedAt?: string;
  notes?: string;
  saleId?: string;
  items: ConditionalItem[];
  tenant_id?: string;
};

export type CheckoutDraft = {
  originType: "conditional";
  originId: string;
  clientId: string;
  createdAt: string;
  items: Array<{
    productId: string;
    qty: number;
  }>;
};

export type MockStoreState = {
  products: Product[];
  clients: Client[];
  sales: SaleRecord[];
  conditionals: ConditionalRecord[];
  checkoutDraft: CheckoutDraft | null;
};
