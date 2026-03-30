import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantMembership } from "@/lib/tenants/membership";
import { getTenantStoreIdentityById } from "@/lib/tenants/repository";

const TENANT_ASSETS_BUCKET = "tenant-assets";

function sanitizePathSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tenant";
}

function getFileExtension(file: File) {
  const nameMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  if (nameMatch) {
    return nameMatch[1].toLowerCase();
  }

  const mimeExtension = file.type.split("/")[1];
  if (mimeExtension) {
    return mimeExtension.toLowerCase();
  }

  return "jpg";
}

export async function POST(request: Request) {
  try {
    const membership = await getCurrentTenantMembership();
    if (!membership) {
      return NextResponse.json({ error: "Usuario sem tenant associado." }, { status: 401 });
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Arquivo de imagem nao enviado." }, { status: 400 });
    }

    if (!fileEntry.type.startsWith("image/")) {
      return NextResponse.json({ error: "Tipo de arquivo invalido. Envie uma imagem." }, { status: 400 });
    }

    const tenant = await getTenantStoreIdentityById(membership.tenantId);
    const tenantSlug = sanitizePathSegment(tenant?.slug ?? membership.tenantId);
    const extension = getFileExtension(fileEntry);
    
    // Using a clear path structure, e.g., slug/logos/timestamp-uuid.jpg
    const filePath = `${tenantSlug}/logos/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(TENANT_ASSETS_BUCKET)
      .upload(filePath, fileEntry, {
        contentType: fileEntry.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar imagem para o storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(TENANT_ASSETS_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({
      path: filePath,
      publicUrl: data.publicUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar arquivo.";
    const status = /tenant associado|arquivo|imagem/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
