import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { addCurrentTenantGiftListItem } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const giftList = await addCurrentTenantGiftListItem(params.id, body);
    return NextResponse.json({ giftList: giftList ? giftListResponse(giftList) : null }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao adicionar item na lista.";
    const status = /Payload|obrigatorio|invalido|permissao|tenant associado|lista|produto|rascunho/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
