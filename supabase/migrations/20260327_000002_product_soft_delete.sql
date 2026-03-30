alter table public.products
  add column if not exists deleted_at timestamptz;

drop index if exists products_tenant_ean_key;

create unique index if not exists products_tenant_ean_key
  on public.products (tenant_id, ean)
  where ean is not null
    and btrim(ean) <> ''
    and deleted_at is null;

create index if not exists products_tenant_deleted_at_idx
  on public.products (tenant_id, deleted_at);
