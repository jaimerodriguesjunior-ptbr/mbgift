import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { removeHostGiftListItemBySlug } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    slug: string;
    itemId: string;
  };
};

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const tenantSlug = url.searchParams.get("tenant") ?? undefined;
    const giftList = await removeHostGiftListItemBySlug(params.slug, token, params.itemId, tenantSlug);

    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ giftList: giftListResponse(giftList) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover item pelo anfitriao.";
    const status = /token|tenant informado|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
