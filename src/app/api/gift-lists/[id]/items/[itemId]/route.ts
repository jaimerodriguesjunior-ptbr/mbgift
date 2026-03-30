import { NextResponse } from "next/server";

import { giftListResponse } from "@/lib/gift-lists/inputs";
import { cancelCurrentTenantGiftListItemReservation, removeCurrentTenantGiftListItem } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    id: string;
    itemId: string;
  };
};

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const giftList = await removeCurrentTenantGiftListItem(params.id, params.itemId);
    return NextResponse.json({ giftList: giftList ? giftListResponse(giftList) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover item da lista.";
    const status = /permissao|tenant associado|lista/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json().catch(() => null);
    const action = body && typeof body.action === "string" ? body.action : "";

    if (action !== "cancel_reservation") {
      return NextResponse.json({ error: "Acao invalida para item da lista." }, { status: 400 });
    }

    const giftList = await cancelCurrentTenantGiftListItemReservation(params.id, params.itemId);
    return NextResponse.json({ giftList: giftList ? giftListResponse(giftList) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cancelar reserva do item da lista.";
    const status = /permissao|tenant associado|lista|item|reserva/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
