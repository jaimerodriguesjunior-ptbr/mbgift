import { NextResponse } from "next/server";

import { clientResponse } from "@/lib/clients/inputs";
import { deleteCurrentTenantClient, getCurrentTenantClient, updateCurrentTenantClient } from "@/lib/clients/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const client = await getCurrentTenantClient(params.id);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ client: clientResponse(client) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar cliente.";
    const status = /tenant associado/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = await request.json();
    const client = await updateCurrentTenantClient(params.id, body);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado para atualização." }, { status: 404 });
    }

    return NextResponse.json({ client: clientResponse(client) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar cliente.";
    const status = /Payload|obrigatório|inválido|permissão|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const deleted = await deleteCurrentTenantClient(params.id);

    if (!deleted) {
      return NextResponse.json({ error: "Cliente não encontrado para exclusão." }, { status: 404 });
    }

    return NextResponse.json(deleted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao excluir cliente.";
    const status = /não pode ser excluído|Payload|obrigatório|inválido|permissão|tenant associado/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
