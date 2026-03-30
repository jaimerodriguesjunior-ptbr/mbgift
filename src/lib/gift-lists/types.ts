import type { Product } from "@/types";

export type GiftListMessageRecord = {
  id: string;
  tenantId: string;
  giftListId: string;
  giftListItemId?: string;
  guestName: string;
  message: string;
  createdAt: string;
};

export type GiftListItemRecord = {
  id: string;
  tenantId: string;
  giftListId: string;
  productId: string;
  note: string;
  status: "disponivel" | "reservado" | "comprado";
  guestName?: string;
  guestMessage?: string;
  reservedAt?: string;
  purchasedAt?: string;
  product: Product | null;
};

export type GiftListRecord = {
  id: string;
  tenantId: string;
  slug: string;
  hostName: string;
  brideName: string;
  eventDate: string;
  city: string;
  headline: string;
  coverImageUrl: string;
  photo: string;
  items: GiftListItemRecord[];
  messages: GiftListMessageRecord[];
  hostAccessTokenHash?: string | null;
};
