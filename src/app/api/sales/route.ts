import { NextResponse } from "next/server";

import { saleResponse } from "@/lib/sales/inputs";
import { createCurrentTenantSale, listCurrentTenantSales } from "@/lib/sales/service";

export async function GET() {
  try {
    const sales = await listCurrentTenantSales();
    return NextResponse.json({
      sales: sales.map((sale) => saleResponse(sale))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar vendas.";
    const status = /tenant associado/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sale = await createCurrentTenantSale(body);
    return NextResponse.json({ sale: saleResponse(sale) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao registrar venda.";
    const status = /Payload|obrigatório|inválido|tenant associado|estoque|condicional|pagamento/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
