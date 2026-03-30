import { NextResponse } from "next/server";

import { cancelCurrentTenantSale } from "@/lib/sales/service";
import { saleResponse } from "@/lib/sales/inputs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = await context.params;

    if (body?.action !== "cancel") {
      return NextResponse.json({ error: "Ação de venda inválida." }, { status: 400 });
    }

    const sales = await cancelCurrentTenantSale(id);
    return NextResponse.json({
      sales: sales.map((sale) => saleResponse(sale))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar venda.";
    const status = /inválida|invalida|tenant associado|nao encontrada|já cancelada|ja cancelada/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
