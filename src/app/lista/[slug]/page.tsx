import type { Metadata } from "next";

import { getPublicGiftListBySlug } from "@/lib/gift-lists/service";
import { getTenantStoreIdentityByIdAdmin } from "@/lib/tenants/repository";

import GuestListPageClient from "./GuestListPageClient";

type GuestListPageProps = {
  params: {
    slug: string;
  };
  searchParams?: {
    tenant?: string | string[];
  };
};

function resolveTenantSlug(searchParams?: GuestListPageProps["searchParams"]) {
  if (!searchParams) {
    return undefined;
  }

  const tenant = searchParams.tenant;
  return typeof tenant === "string" ? tenant : tenant?.[0];
}

export async function generateMetadata({ params, searchParams }: GuestListPageProps): Promise<Metadata> {
  try {
    const tenantSlug = resolveTenantSlug(searchParams);
    const giftList = await getPublicGiftListBySlug(params.slug, tenantSlug);

    if (!giftList) {
      return {};
    }

    const tenant = await getTenantStoreIdentityByIdAdmin(giftList.tenantId);
    const storeLabel = tenant?.logoLabel ?? tenant?.displayName ?? "MBGifts";
    const title = `${storeLabel} - Lista de Presentes`;
    const description = `Confira a lista de presentes de ${giftList.brideName} na ${storeLabel}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: storeLabel,
        images: [
          {
            url: "/apple-touch-icon.png",
            width: 180,
            height: 180,
            alt: storeLabel
          }
        ]
      },
      twitter: {
        title,
        description,
        images: ["/apple-touch-icon.png"]
      }
    };
  } catch {
    return {};
  }
}

export default function GuestListPage({ params }: GuestListPageProps) {
  return <GuestListPageClient params={params} />;
}
