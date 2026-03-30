import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { getCurrentTenantGiftList, updateCurrentTenantGiftList } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const giftList = await getCurrentTenantGiftList(params.id);
    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ giftList: giftListResponse(giftList) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar lista.";
    const status = /tenant associado/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const giftList = await updateCurrentTenantGiftList(params.id, body);
    if (!giftList) {
      return NextResponse.json({ error: "Lista nao encontrada para atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ giftList: giftListResponse(giftList) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar lista.";
    const status = /Payload|obrigatorio|invalido|permissao|tenant associado|slug/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
