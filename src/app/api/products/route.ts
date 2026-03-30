import { NextResponse } from "next/server";

import { createCurrentTenantProduct, listCurrentTenantProducts } from "@/lib/products/service";
import { productResponse } from "@/lib/products/inputs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const products = await listCurrentTenantProducts(query);

    return NextResponse.json({
      products: products.map((product) => productResponse(product))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar produtos.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await createCurrentTenantProduct(body);

    return NextResponse.json(
      { product: productResponse(product) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar produto.";
    const status = /Payload|obrigatório|inválido|permissão|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
