import { NextResponse } from "next/server";

import { productResponse } from "@/lib/products/inputs";
import { deleteCurrentTenantProduct, getCurrentTenantProduct, updateCurrentTenantProduct } from "@/lib/products/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const product = await getCurrentTenantProduct(params.id);

    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ product: productResponse(product) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar produto.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const product = await updateCurrentTenantProduct(params.id, body);

    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado para atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ product: productResponse(product) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar produto.";
    const status = /Payload|obrigatorio|invalido|permissao|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const result = await deleteCurrentTenantProduct(params.id);

    if (!result) {
      return NextResponse.json({ error: "Produto nao encontrado para exclusao." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao excluir produto.";
    const status = /permissao|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
