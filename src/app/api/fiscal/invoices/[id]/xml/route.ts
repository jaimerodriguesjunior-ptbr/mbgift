import { NextResponse } from "next/server";

import { getCurrentTenantFiscalInvoiceXml } from "@/lib/fiscal/service";

type RouteContext = {
  params: {
    id: string;
  };
};

function buildFileName(accessKey: string, number: string | null) {
  const baseName = number ? `nfe-entrada-${number}` : `nfe-entrada-${accessKey}`;
  return `${baseName}.xml`;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const payload = await getCurrentTenantFiscalInvoiceXml(params.id);
    if (!payload) {
      return NextResponse.json({ error: "XML da nota nao encontrado." }, { status: 404 });
    }

    return new NextResponse(payload.xmlContent, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildFileName(payload.accessKey, payload.number)}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar XML da nota fiscal.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
