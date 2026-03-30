import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

function getArg(flag) {
  const entry = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.slice(flag.length + 1) : undefined;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value;
}

function requiredArg(flag, label) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Parametro obrigatorio ausente: ${label}`);
  }
  return value;
}

function loadSeed(seedPath) {
  const absolutePath = resolve(process.cwd(), seedPath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function upsertProducts(supabase, tenantId, products) {
  const productRows = products.map((product) => ({
    tenant_id: tenantId,
    name: product.name,
    category: product.category,
    ean: product.ean || null,
    price: product.price,
    stock_quantity: product.stock,
    image_urls: product.images ?? [],
    main_image_index: product.mainImageIndex ?? 0,
    is_draft: product.isDraft ?? false
  }));

  for (const productRow of productRows) {
    if (productRow.ean) {
      const { data: existingProduct, error: lookupError } = await supabase
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("ean", productRow.ean)
        .maybeSingle();

      if (lookupError) {
        throw new Error(`Falha ao localizar produto existente por EAN: ${lookupError.message}`);
      }

      if (existingProduct) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productRow)
          .eq("id", existingProduct.id);

        if (updateError) {
          throw new Error(`Falha ao atualizar produto existente: ${updateError.message}`);
        }

        continue;
      }
    }

    const { error: insertError } = await supabase
      .from("products")
      .insert(productRow);

    if (insertError) {
      throw new Error(`Falha ao importar produtos: ${insertError.message}`);
    }
  }

  return productRows.length;
}

async function upsertClients(supabase, tenantId, clients) {
  const clientRows = clients.map((client) => ({
    tenant_id: tenantId,
    name: client.name,
    phone: client.phone ?? null,
    instagram: client.instagram ?? null,
    photo_url: client.photo ?? null,
    cpf: client.cpf ?? null,
    address_text: client.address ?? null,
    is_trusted: client.isTrusted ?? false
  }));

  for (const clientRow of clientRows) {
    if (clientRow.cpf) {
      const { data: existingClient, error: lookupError } = await supabase
        .from("clients")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("cpf", clientRow.cpf)
        .maybeSingle();

      if (lookupError) {
        throw new Error(`Falha ao localizar cliente existente por CPF: ${lookupError.message}`);
      }

      if (existingClient) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(clientRow)
          .eq("id", existingClient.id);

        if (updateError) {
          throw new Error(`Falha ao atualizar cliente existente: ${updateError.message}`);
        }

        continue;
      }
    }

    const { error: insertError } = await supabase
      .from("clients")
      .insert(clientRow);

    if (insertError) {
      throw new Error(`Falha ao importar clientes: ${insertError.message}`);
    }
  }

  return clientRows.length;
}

async function seedGiftLists(supabase, tenantId, giftLists) {
  const { data: products, error: productsLookupError } = await supabase
    .from("products")
    .select("id, ean")
    .eq("tenant_id", tenantId);

  if (productsLookupError) {
    throw new Error(`Falha ao carregar produtos do tenant para listas: ${productsLookupError.message}`);
  }

  const productIdByEan = new Map(
    (products ?? [])
      .filter((product) => typeof product.ean === "string" && product.ean.length > 0)
      .map((product) => [product.ean, product.id])
  );

  let giftListsProcessed = 0;
  let giftListItemsProcessed = 0;

  for (const giftList of giftLists ?? []) {
    const giftListPayload = {
      tenant_id: tenantId,
      slug: giftList.slug,
      host_name: giftList.hostName,
      event_date: giftList.eventDate ?? null,
      city: giftList.city ?? null,
      headline: giftList.headline ?? null,
      cover_image_url: giftList.coverImageUrl ?? null,
      host_access_token_hash: hashToken(giftList.hostAccessToken)
    };

    const { data: existingGiftList, error: giftListLookupError } = await supabase
      .from("gift_lists")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", giftList.slug)
      .maybeSingle();

    if (giftListLookupError) {
      throw new Error(`Falha ao localizar lista existente por slug: ${giftListLookupError.message}`);
    }

    let giftListId = existingGiftList?.id;

    if (giftListId) {
      const { error: giftListUpdateError } = await supabase
        .from("gift_lists")
        .update(giftListPayload)
        .eq("id", giftListId);

      if (giftListUpdateError) {
        throw new Error(`Falha ao atualizar lista existente: ${giftListUpdateError.message}`);
      }

      const { error: messagesDeleteError } = await supabase
        .from("gift_list_messages")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("gift_list_id", giftListId);

      if (messagesDeleteError) {
        throw new Error(`Falha ao limpar recados existentes da lista: ${messagesDeleteError.message}`);
      }

      const { error: itemsDeleteError } = await supabase
        .from("gift_list_items")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("gift_list_id", giftListId);

      if (itemsDeleteError) {
        throw new Error(`Falha ao limpar itens existentes da lista: ${itemsDeleteError.message}`);
      }
    } else {
      const { data: insertedGiftList, error: giftListInsertError } = await supabase
        .from("gift_lists")
        .insert(giftListPayload)
        .select("id")
        .single();

      if (giftListInsertError) {
        throw new Error(`Falha ao importar lista: ${giftListInsertError.message}`);
      }

      giftListId = insertedGiftList.id;
    }

    for (const item of giftList.items ?? []) {
      const productId = productIdByEan.get(item.productEan);
      if (!productId) {
        throw new Error(`Produto nao encontrado para a lista ${giftList.slug}: ${item.productEan}`);
      }

      const itemPayload = {
        tenant_id: tenantId,
        gift_list_id: giftListId,
        product_id: productId,
        note: item.note ?? null,
        status: item.status ?? "disponivel",
        reserved_by_name: item.guestName ?? null,
        reserved_message: item.guestMessage ?? null,
        reserved_at: item.status === "reservado" ? new Date().toISOString() : null,
        purchased_at: item.status === "comprado" ? new Date().toISOString() : null
      };

      const { data: insertedItem, error: itemInsertError } = await supabase
        .from("gift_list_items")
        .insert(itemPayload)
        .select("id")
        .single();

      if (itemInsertError) {
        throw new Error(`Falha ao importar item da lista ${giftList.slug}: ${itemInsertError.message}`);
      }

      if (item.guestMessage) {
        const { error: messageInsertError } = await supabase
          .from("gift_list_messages")
          .insert({
            tenant_id: tenantId,
            gift_list_id: giftListId,
            gift_list_item_id: insertedItem.id,
            guest_name: item.guestName ?? "Convidado",
            message: item.guestMessage
          });

        if (messageInsertError) {
          throw new Error(`Falha ao importar recado da lista ${giftList.slug}: ${messageInsertError.message}`);
        }
      }

      giftListItemsProcessed += 1;
    }

    giftListsProcessed += 1;
  }

  return {
    giftListsProcessed,
    giftListItemsProcessed
  };
}

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const seedFile = getArg("--seed") ?? "supabase/seeds/mbgifts.mock.json";
  const tenantSlug = requiredArg("--tenant-slug", "--tenant-slug");

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const seed = loadSeed(seedFile);

  const { data: tenant, error: tenantLookupError } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("slug", tenantSlug)
    .single();

  if (tenantLookupError) {
    throw new Error(`Falha ao localizar tenant por slug: ${tenantLookupError.message}`);
  }

  const { error: tenantUpdateError } = await supabase
    .from("tenants")
    .update({
      business_name: seed.tenant.businessName,
      display_name: seed.tenant.displayName,
      logo_label: seed.tenant.logoLabel,
      tagline: seed.tenant.tagline,
      primary_color: seed.tenant.primaryColor,
      secondary_color: seed.tenant.secondaryColor,
      contact_email: seed.tenant.contactEmail,
      contact_phone: seed.tenant.contactPhone,
      document_cnpj: seed.tenant.documentCnpj,
      address_line1: seed.tenant.addressLine1,
      address_district: seed.tenant.addressDistrict,
      address_city: seed.tenant.addressCity,
      address_state: seed.tenant.addressState,
      address_zip_code: seed.tenant.addressZipCode,
      tax_regime: seed.tenant.taxRegime
    })
    .eq("id", tenant.id);

  if (tenantUpdateError) {
    throw new Error(`Falha ao atualizar identidade do tenant: ${tenantUpdateError.message}`);
  }

  const productsProcessed = await upsertProducts(supabase, tenant.id, seed.products ?? []);
  const clientsProcessed = await upsertClients(supabase, tenant.id, seed.clients ?? []);
  const listStats = await seedGiftLists(supabase, tenant.id, seed.giftLists ?? []);

  console.log(`Seed concluido para o tenant "${tenant.slug}".`);
  console.log(`Produtos processados: ${productsProcessed}`);
  console.log(`Clientes processados: ${clientsProcessed}`);
  console.log(`Listas processadas: ${listStats.giftListsProcessed}`);
  console.log(`Itens de lista processados: ${listStats.giftListItemsProcessed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
