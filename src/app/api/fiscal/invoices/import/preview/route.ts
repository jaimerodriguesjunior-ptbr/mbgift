import { NextResponse } from "next/server";

import { previewCurrentTenantFiscalImport } from "@/lib/fiscal/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preview = await previewCurrentTenantFiscalImport(String(body.xmlContent ?? ""));
    return NextResponse.json({ preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar preview da importacao.";
    const status = /tenant associado|vazia|modelo 55|ja foi importada|nao suportado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
