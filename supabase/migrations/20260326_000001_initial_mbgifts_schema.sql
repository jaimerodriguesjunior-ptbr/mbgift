create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  business_name text not null,
  display_name text not null,
  logo_label text,
  tagline text,
  primary_color text,
  secondary_color text,
  contact_email text,
  contact_phone text,
  document_cnpj text,
  address_line1 text,
  address_line2 text,
  address_district text,
  address_city text,
  address_state text,
  address_zip_code text,
  state_registration text,
  municipal_registration text,
  tax_regime text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'staff')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, profile_id)
);

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.profile_id = auth.uid()
  );
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  category text not null default 'Geral',
  ean text,
  price numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  image_urls jsonb not null default '[]'::jsonb,
  main_image_index integer not null default 0,
  is_draft boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  phone text,
  instagram text,
  photo_url text,
  cpf text,
  address_text text,
  is_trusted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gift_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  slug text not null,
  host_name text not null,
  event_date date,
  city text,
  headline text,
  cover_image_url text,
  host_access_token_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, slug)
);

create table if not exists public.gift_list_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  gift_list_id uuid not null references public.gift_lists (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  note text,
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'comprado')),
  reserved_by_name text,
  reserved_message text,
  reserved_at timestamptz,
  purchased_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gift_list_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  gift_list_id uuid not null references public.gift_lists (id) on delete cascade,
  gift_list_item_id uuid references public.gift_list_items (id) on delete set null,
  guest_name text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conditionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'converted_full', 'converted_partial', 'returned_full', 'canceled')),
  opened_at timestamptz not null default timezone('utc', now()),
  due_date date not null,
  receipt_printed_at timestamptz,
  notes text,
  sale_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conditional_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conditional_id uuid not null references public.conditionals (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  qty_sent integer not null check (qty_sent >= 0),
  qty_sold integer not null default 0 check (qty_sold >= 0),
  qty_returned integer not null default 0 check (qty_returned >= 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text,
  cpf text,
  origin_type text not null default 'direct' check (origin_type in ('direct', 'conditional')),
  origin_id uuid,
  total numeric(12,2) not null default 0,
  sold_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  method text not null check (method in ('credito', 'debito', 'pix', 'dinheiro', 'boleto')),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.conditionals
  add constraint conditionals_sale_id_fkey
  foreign key (sale_id) references public.sales (id) on delete set null;

create unique index if not exists products_tenant_ean_key
  on public.products (tenant_id, ean)
  where ean is not null and btrim(ean) <> '';

create unique index if not exists clients_tenant_cpf_key
  on public.clients (tenant_id, cpf)
  where cpf is not null and btrim(cpf) <> '';

create index if not exists products_tenant_id_idx on public.products (tenant_id);
create index if not exists clients_tenant_id_idx on public.clients (tenant_id);
create index if not exists gift_lists_tenant_id_idx on public.gift_lists (tenant_id);
create index if not exists gift_list_items_tenant_id_idx on public.gift_list_items (tenant_id);
create index if not exists conditionals_tenant_id_idx on public.conditionals (tenant_id);
create index if not exists conditional_items_tenant_id_idx on public.conditional_items (tenant_id);
create index if not exists sales_tenant_id_idx on public.sales (tenant_id);
create index if not exists sale_items_tenant_id_idx on public.sale_items (tenant_id);
create index if not exists sale_payments_tenant_id_idx on public.sale_payments (tenant_id);

create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_tenant_memberships_updated_at
before update on public.tenant_memberships
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_gift_lists_updated_at
before update on public.gift_lists
for each row execute function public.set_updated_at();

create trigger set_gift_list_items_updated_at
before update on public.gift_list_items
for each row execute function public.set_updated_at();

create trigger set_conditionals_updated_at
before update on public.conditionals
for each row execute function public.set_updated_at();

create trigger set_conditional_items_updated_at
before update on public.conditional_items
for each row execute function public.set_updated_at();

create trigger set_sales_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create trigger set_sale_items_updated_at
before update on public.sale_items
for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.gift_lists enable row level security;
alter table public.gift_list_items enable row level security;
alter table public.gift_list_messages enable row level security;
alter table public.conditionals enable row level security;
alter table public.conditional_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "tenant_memberships_select_own"
on public.tenant_memberships
for select
using (auth.uid() = profile_id);

create policy "tenants_select_members"
on public.tenants
for select
using (public.is_tenant_member(id));

create policy "tenants_update_members"
on public.tenants
for update
using (public.is_tenant_member(id))
with check (public.is_tenant_member(id));

create policy "products_select_members"
on public.products
for select
using (public.is_tenant_member(tenant_id));

create policy "products_insert_members"
on public.products
for insert
with check (public.is_tenant_member(tenant_id));

create policy "products_update_members"
on public.products
for update
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "products_delete_members"
on public.products
for delete
using (public.is_tenant_member(tenant_id));

create policy "clients_select_members"
on public.clients
for select
using (public.is_tenant_member(tenant_id));

create policy "clients_insert_members"
on public.clients
for insert
with check (public.is_tenant_member(tenant_id));

create policy "clients_update_members"
on public.clients
for update
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "clients_delete_members"
on public.clients
for delete
using (public.is_tenant_member(tenant_id));

create policy "gift_lists_select_members"
on public.gift_lists
for select
using (public.is_tenant_member(tenant_id));

create policy "gift_lists_insert_members"
on public.gift_lists
for insert
with check (public.is_tenant_member(tenant_id));

create policy "gift_lists_update_members"
on public.gift_lists
for update
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "gift_lists_delete_members"
on public.gift_lists
for delete
using (public.is_tenant_member(tenant_id));

create policy "gift_list_items_members_all"
on public.gift_list_items
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "gift_list_messages_members_all"
on public.gift_list_messages
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "conditionals_members_all"
on public.conditionals
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "conditional_items_members_all"
on public.conditional_items
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "sales_members_all"
on public.sales
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "sale_items_members_all"
on public.sale_items
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "sale_payments_members_all"
on public.sale_payments
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create or replace function public.create_tenant_with_owner(
  tenant_slug text,
  tenant_business_name text,
  tenant_display_name text,
  tenant_logo_label text default null,
  tenant_tagline text default null
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant public.tenants;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  insert into public.profiles (id, email)
  values (auth.uid(), auth.jwt() ->> 'email')
  on conflict (id) do update
  set email = excluded.email;

  insert into public.tenants (
    slug,
    business_name,
    display_name,
    logo_label,
    tagline
  )
  values (
    tenant_slug,
    tenant_business_name,
    tenant_display_name,
    tenant_logo_label,
    tenant_tagline
  )
  returning * into new_tenant;

  insert into public.tenant_memberships (tenant_id, profile_id, role)
  values (new_tenant.id, auth.uid(), 'owner');

  return new_tenant;
end;
$$;
