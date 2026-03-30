import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { getHostGiftListBySlug, updateHostGiftListBySlug } from "@/lib/gift-lists/service";
import { getTenantStoreIdentityByIdAdmin } from "@/lib/tenants/repository";

type RouteContext = {
  params: {
    slug: string;
  };
};

function readHostQuery(request: Request) {
  const url = new URL(request.url);
  return {
    token: url.searchParams.get("token") ?? "",
    tenantSlug: url.searchParams.get("tenant") ?? undefined
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { token, tenantSlug } = readHostQuery(request);
    const giftList = await getHostGiftListBySlug(params.slug, token, tenantSlug);
    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    const tenant = await getTenantStoreIdentityByIdAdmin(giftList.tenantId);
    return NextResponse.json({ giftList: giftListResponse(giftList), tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar painel do anfitriao.";
    const status = /token|tenant informado|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const query = readHostQuery(request);
    const token = typeof body?.token === "string" && body.token.length > 0 ? body.token : query.token;
    const tenantSlug = typeof body?.tenantSlug === "string" && body.tenantSlug.length > 0 ? body.tenantSlug : query.tenantSlug;
    const giftList = await updateHostGiftListBySlug(params.slug, token, body, tenantSlug);

    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada para atualizacao." }, { status: 404 });
    }

    const tenant = await getTenantStoreIdentityByIdAdmin(giftList.tenantId);
    return NextResponse.json({ giftList: giftListResponse(giftList), tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar lista do anfitriao.";
    const status = /Payload|obrigatorio|invalido|token|tenant informado|slug|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
