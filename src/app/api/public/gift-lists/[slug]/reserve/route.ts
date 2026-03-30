import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { reservePublicGiftBySlug } from "@/lib/gift-lists/service";
import { getTenantStoreIdentityByIdAdmin } from "@/lib/tenants/repository";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const tenantSlug = typeof body?.tenantSlug === "string" && body.tenantSlug.length > 0
      ? body.tenantSlug
      : undefined;
    const giftList = await reservePublicGiftBySlug(params.slug, body, tenantSlug);

    const tenant = giftList ? await getTenantStoreIdentityByIdAdmin(giftList.tenantId) : null;
    return NextResponse.json({
      giftList: giftList ? giftListResponse(giftList) : null,
      tenant
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao reservar presente.";
    const status = /Payload|obrigatorio|invalido|tenant informado|item da lista|presente|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
