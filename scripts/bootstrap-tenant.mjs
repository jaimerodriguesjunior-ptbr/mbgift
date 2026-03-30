import { loadLocalEnv } from "./load-local-env.mjs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

function getArg(flag) {
  const entry = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.slice(flag.length + 1) : undefined;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function requiredArg(flag, label) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Parâmetro obrigatório ausente: ${label}`);
  }
  return value;
}

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const ownerUserId = requiredArg("--owner-user-id", "--owner-user-id");
  const slug = requiredArg("--slug", "--slug");
  const businessName = requiredArg("--business-name", "--business-name");
  const displayName = requiredArg("--display-name", "--display-name");
  const logoLabel = getArg("--logo-label") ?? null;
  const tagline = getArg("--tagline") ?? null;

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      slug,
      business_name: businessName,
      display_name: displayName,
      logo_label: logoLabel,
      tagline
    })
    .select("id, slug, display_name")
    .single();

  if (tenantError) {
    throw new Error(`Falha ao criar tenant: ${tenantError.message}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: ownerUserId
    });

  if (profileError) {
    throw new Error(`Falha ao preparar profile do owner: ${profileError.message}`);
  }

  const { error: membershipError } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: tenant.id,
      profile_id: ownerUserId,
      role: "owner"
    });

  if (membershipError) {
    throw new Error(`Falha ao criar membership do owner: ${membershipError.message}`);
  }

  console.log("Tenant criado com sucesso:");
  console.log(JSON.stringify(tenant, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
