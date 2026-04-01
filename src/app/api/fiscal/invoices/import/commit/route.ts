import { NextResponse } from "next/server";

import { commitCurrentTenantFiscalImport } from "@/lib/fiscal/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await commitCurrentTenantFiscalImport({
      xmlContent: String(body.xmlContent ?? ""),
      resolutions: Array.isArray(body.resolutions) ? body.resolutions : []
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao concluir importacao fiscal.";
    const status = /tenant associado|vazia|modelo 55|ja foi importada|nao foi encontrado|precisa de um produto/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
