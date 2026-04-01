alter table public.tenants
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_ibge_code text,
  add column if not exists nfce_homologation_csc_id text,
  add column if not exists nfce_homologation_csc_token text,
  add column if not exists nfce_production_csc_id text,
  add column if not exists nfce_production_csc_token text;

alter table public.products
  add column if not exists sku text,
  add column if not exists brand text,
  add column if not exists cost_price numeric(12,2),
  add column if not exists last_purchase_price numeric(12,2),
  add column if not exists last_purchase_at timestamptz,
  add column if not exists ean_tributavel text,
  add column if not exists commercial_unit text,
  add column if not exists tributary_unit text,
  add column if not exists tributary_factor numeric(12,6),
  add column if not exists ncm text,
  add column if not exists cest text,
  add column if not exists origin_code text,
  add column if not exists cfop_entry_default text,
  add column if not exists cfop_sale_default text,
  add column if not exists cfop_return_default text,
  add column if not exists icms_code text,
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text,
  add column if not exists ipi_cst text,
  add column if not exists ipi_enq text,
  add column if not exists anp_code text,
  add column if not exists benefit_code text,
  add column if not exists fiscal_notes text;

alter table public.clients
  add column if not exists address_zip_code text,
  add column if not exists address_line1 text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_ibge_code text,
  add column if not exists state_registration text,
  add column if not exists taxpayer_indicator text;

create table if not exists public.fiscal_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  related_invoice_id uuid references public.fiscal_invoices (id) on delete set null,
  direction text not null default 'entry' check (direction in ('entry', 'output')),
  document_type text not null default 'NFe' check (document_type in ('NFe', 'NFCe', 'NFSe')),
  document_model text,
  operation_kind text,
  status text not null default 'authorized' check (status in ('draft', 'processing', 'authorized', 'cancelled', 'rejected', 'error')),
  environment text default 'production' check (environment in ('production', 'homologation')),
  access_key text not null,
  xml_content text not null,
  xml_hash text not null,
  number text,
  series text,
  issue_date timestamptz,
  entry_date timestamptz not null default timezone('utc', now()),
  nature_operation text,
  total_products_amount numeric(15,2),
  total_discount_amount numeric(15,2),
  total_freight_amount numeric(15,2),
  total_insurance_amount numeric(15,2),
  total_other_amount numeric(15,2),
  total_invoice_amount numeric(15,2),
  issuer_name text,
  issuer_document text,
  issuer_state_registration text,
  issuer_email text,
  issuer_snapshot jsonb not null default '{}'::jsonb,
  recipient_name text,
  recipient_document text,
  recipient_state_registration text,
  recipient_email text,
  recipient_snapshot jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, access_key)
);

create table if not exists public.fiscal_invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invoice_id uuid not null references public.fiscal_invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  source_item_key text not null,
  line_number integer not null,
  action_taken text not null default 'unlinked' check (action_taken in ('update_existing', 'create_new', 'unlinked')),
  match_mode text not null default 'none' check (match_mode in ('auto_ean', 'auto_name', 'manual', 'none')),
  codigo text,
  ean text,
  descricao text not null,
  ncm text,
  cest text,
  cfop text,
  commercial_unit text,
  tributary_unit text,
  quantity numeric(15,4) not null default 0,
  unit_price numeric(15,4) not null default 0,
  total_price numeric(15,2) not null default 0,
  discount_value numeric(15,2),
  freight_value numeric(15,2),
  insurance_value numeric(15,2),
  other_value numeric(15,2),
  tax_snapshot jsonb not null default '{}'::jsonb,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (invoice_id, source_item_key)
);

create index if not exists fiscal_invoices_tenant_created_idx
  on public.fiscal_invoices (tenant_id, created_at desc);

create index if not exists fiscal_invoices_tenant_issue_idx
  on public.fiscal_invoices (tenant_id, issue_date desc);

create index if not exists fiscal_invoices_tenant_direction_idx
  on public.fiscal_invoices (tenant_id, direction);

create index if not exists fiscal_invoices_tenant_status_idx
  on public.fiscal_invoices (tenant_id, status);

create index if not exists fiscal_invoices_related_invoice_idx
  on public.fiscal_invoices (related_invoice_id);

create index if not exists fiscal_invoice_items_tenant_invoice_idx
  on public.fiscal_invoice_items (tenant_id, invoice_id);

create index if not exists fiscal_invoice_items_product_idx
  on public.fiscal_invoice_items (product_id);

create trigger set_fiscal_invoices_updated_at
before update on public.fiscal_invoices
for each row execute function public.set_updated_at();

alter table public.fiscal_invoices enable row level security;
alter table public.fiscal_invoice_items enable row level security;

create policy "fiscal_invoices_members_all"
on public.fiscal_invoices
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

create policy "fiscal_invoice_items_members_all"
on public.fiscal_invoice_items
for all
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));
