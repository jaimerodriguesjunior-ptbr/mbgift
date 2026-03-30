import { NextResponse } from "next/server";

import { conditionalResponse } from "@/lib/conditionals/inputs";
import { createCurrentTenantConditional, listCurrentTenantConditionals } from "@/lib/conditionals/service";

export async function GET() {
  try {
    const conditionals = await listCurrentTenantConditionals();
    return NextResponse.json({
      conditionals: conditionals.map((conditional) => conditionalResponse(conditional))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar condicionais.";
    const status = /tenant associado/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conditional = await createCurrentTenantConditional(body);
    return NextResponse.json(
      { conditional: conditional ? conditionalResponse(conditional) : null },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar condicional.";
    const status = /Payload|obrigatório|inválido|permissão|tenant associado|cliente|estoque|condicional/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
