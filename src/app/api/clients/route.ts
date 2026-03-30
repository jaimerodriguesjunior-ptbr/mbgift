import { NextResponse } from "next/server";

import { clientResponse } from "@/lib/clients/inputs";
import { createCurrentTenantClient, listCurrentTenantClients } from "@/lib/clients/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const clients = await listCurrentTenantClients(query);

    return NextResponse.json({
      clients: clients.map((client) => clientResponse(client))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar clientes.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await createCurrentTenantClient(body);

    return NextResponse.json(
      { client: clientResponse(client) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar cliente.";
    const status = /Payload|obrigatório|inválido|permissão|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
