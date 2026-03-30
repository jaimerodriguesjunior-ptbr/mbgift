import { NextResponse } from "next/server";

import { getHostGiftListBySlug } from "@/lib/gift-lists/service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantMembership } from "@/lib/tenants/membership";
import { getTenantStoreIdentityById } from "@/lib/tenants/repository";

const GIFT_LIST_COVERS_BUCKET = "gift-list-covers";

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

async function resolveUploadTenant(formData: FormData) {
  const giftListSlugEntry = formData.get("giftListSlug");
  const hostTokenEntry = formData.get("hostToken");
  const tenantSlugEntry = formData.get("tenantSlug");

  const giftListSlug = typeof giftListSlugEntry === "string" ? giftListSlugEntry : "";
  const hostToken = typeof hostTokenEntry === "string" ? hostTokenEntry : "";
  const tenantSlug = typeof tenantSlugEntry === "string" ? tenantSlugEntry : undefined;

  if (!giftListSlug || !hostToken) {
    const membership = await getCurrentTenantMembership();
    if (membership) {
      return { tenantId: membership.tenantId };
    }

    throw new Error("Acesso nao autorizado para enviar capa da lista.");
  }

  const giftList = await getHostGiftListBySlug(giftListSlug, hostToken, tenantSlug);
  if (!giftList) {
    throw new Error("Lista nao encontrada para atualizar a capa.");
  }

  return { tenantId: giftList.tenantId };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Arquivo de imagem nao enviado." }, { status: 400 });
    }

    if (!fileEntry.type.startsWith("image/")) {
      return NextResponse.json({ error: "Tipo de arquivo invalido. Envie uma imagem." }, { status: 400 });
    }

    const uploadTarget = await resolveUploadTenant(formData);
    const tenant = await getTenantStoreIdentityById(uploadTarget.tenantId);
    const tenantSlug = sanitizePathSegment(tenant?.slug ?? uploadTarget.tenantId);
    const extension = getFileExtension(fileEntry);
    const filePath = `${tenantSlug}/gift-lists/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(GIFT_LIST_COVERS_BUCKET)
      .upload(filePath, fileEntry, {
        contentType: fileEntry.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar imagem para o storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(GIFT_LIST_COVERS_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({
      path: filePath,
      publicUrl: data.publicUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar imagem da lista.";
    const status = /nao autorizado|arquivo|imagem|token|lista nao encontrada/i.test(message) ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
