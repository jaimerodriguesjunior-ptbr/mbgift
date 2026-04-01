import { NextResponse } from "next/server";

import { listCurrentTenantFiscalInvoices } from "@/lib/fiscal/service";

export async function GET() {
  try {
    const invoices = await listCurrentTenantFiscalInvoices();
    return NextResponse.json({ invoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar notas fiscais.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
