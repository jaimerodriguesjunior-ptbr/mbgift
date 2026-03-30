import { NextResponse } from "next/server";

import { conditionalCheckoutDraftResponse, conditionalResponse } from "@/lib/conditionals/inputs";
import {
  closeCurrentTenantConditionalAsReturned,
  getCurrentTenantConditional,
  markCurrentTenantConditionalReceiptPrinted,
  prepareCurrentTenantConditionalCheckout
} from "@/lib/conditionals/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const conditional = await getCurrentTenantConditional(params.id);
    if (!conditional) {
      return NextResponse.json({ error: "Condicional não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ conditional: conditionalResponse(conditional) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar condicional.";
    const status = /tenant associado/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "mark_receipt_printed") {
      const conditional = await markCurrentTenantConditionalReceiptPrinted(params.id);
      return NextResponse.json({ conditional: conditional ? conditionalResponse(conditional) : null });
    }

    if (action === "close_returned") {
      const conditional = await closeCurrentTenantConditionalAsReturned(params.id, body);
      return NextResponse.json({ conditional: conditional ? conditionalResponse(conditional) : null });
    }

    if (action === "prepare_checkout") {
      const draft = await prepareCurrentTenantConditionalCheckout(params.id, body);
      return NextResponse.json({ checkoutDraft: conditionalCheckoutDraftResponse(draft) });
    }

    return NextResponse.json({ error: "Ação inválida para condicional." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar condicional.";
    const status = /Payload|obrigatório|inválido|permissão|tenant associado|condicional|estoque/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
