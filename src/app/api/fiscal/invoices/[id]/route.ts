import { NextResponse } from "next/server";

import { getCurrentTenantFiscalInvoice } from "@/lib/fiscal/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const invoice = await getCurrentTenantFiscalInvoice(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Nota fiscal nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar nota fiscal.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
