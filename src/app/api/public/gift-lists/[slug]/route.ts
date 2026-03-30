import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { getPublicGiftListBySlug } from "@/lib/gift-lists/service";
import { getTenantStoreIdentityByIdAdmin } from "@/lib/tenants/repository";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get("tenant") ?? undefined;
    const giftList = await getPublicGiftListBySlug(params.slug, tenantSlug);
    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    const tenant = await getTenantStoreIdentityByIdAdmin(giftList.tenantId);
    return NextResponse.json({ giftList: giftListResponse(giftList), tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar lista publica.";
    const status = /tenant informado|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
