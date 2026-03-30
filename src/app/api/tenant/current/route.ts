import { NextResponse } from "next/server";

import { tenantSettingsResponse } from "@/lib/tenants/settings";
import { getCurrentTenantSettings, updateCurrentTenantSettings } from "@/lib/tenants/service";

export async function GET() {
  try {
    const tenant = await getCurrentTenantSettings();

    if (!tenant) {
      return NextResponse.json(
        { error: "Nenhum tenant associado ao usuário atual." },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant: tenantSettingsResponse(tenant) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar tenant atual." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const tenant = await updateCurrentTenantSettings(body);

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant atual não encontrado para atualização." },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant: tenantSettingsResponse(tenant) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar tenant atual.";
    const status = /Payload|obrigatório|válido|permissão|sem tenant/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
