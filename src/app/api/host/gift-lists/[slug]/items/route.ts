import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { addHostGiftListItemBySlug } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const giftList = await addHostGiftListItemBySlug(
      params.slug,
      typeof body?.token === "string" ? body.token : "",
      body,
      typeof body?.tenantSlug === "string" ? body.tenantSlug : undefined
    );

    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ giftList: giftListResponse(giftList) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao adicionar item pelo anfitriao.";
    const status = /Payload|obrigatorio|invalido|token|tenant informado|lista|produto|rascunho|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
