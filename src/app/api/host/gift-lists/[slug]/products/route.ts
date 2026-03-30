import { NextResponse } from "next/server";

import { productResponse } from "@/lib/products/inputs";
import { listHostGiftListProductsBySlug } from "@/lib/gift-lists/service";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const tenantSlug = url.searchParams.get("tenant") ?? undefined;
    const products = await listHostGiftListProductsBySlug(params.slug, token, tenantSlug);

    if (!products) {
      return NextResponse.json({ error: "Lista nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      products: products.map((product) => productResponse(product))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar produtos do anfitriao.";
    const status = /token|tenant informado|ambiguo/i.test(message) ? 400 : /nao encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
