import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { createCurrentTenantGiftList, listCurrentTenantGiftLists } from "@/lib/gift-lists/service";

export async function GET() {
  try {
    const giftLists = await listCurrentTenantGiftLists();
    return NextResponse.json({
      giftLists: giftLists.map((giftList) => giftListResponse(giftList))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar listas.";
    const status = /tenant associado/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createCurrentTenantGiftList(body);

    return NextResponse.json(
      {
        giftList: result.giftList ? giftListResponse(result.giftList) : null,
        hostAccessToken: result.hostAccessToken
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar lista.";
    const status = /Payload|obrigatorio|invalido|permissao|tenant associado|slug/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
