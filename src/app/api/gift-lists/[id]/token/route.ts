import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { regenerateCurrentTenantGiftListToken } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const result = await regenerateCurrentTenantGiftListToken(params.id);
    return NextResponse.json({
      giftList: giftListResponse(result.giftList!),
      hostAccessToken: result.hostAccessToken
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar novo acesso.";
    const status = /permissao|tenant associado/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
