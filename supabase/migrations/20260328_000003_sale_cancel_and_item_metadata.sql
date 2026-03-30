alter table public.sales
  add column if not exists canceled_at timestamptz;

alter table public.sale_items
  add column if not exists gift_list_item_id uuid references public.gift_list_items (id) on delete set null,
  add column if not exists source_type text not null default 'direct' check (source_type in ('direct', 'conditional'));

update public.sale_items as si
set source_type = s.origin_type
from public.sales as s
where s.id = si.sale_id
  and s.tenant_id = si.tenant_id
  and (si.source_type is null or si.source_type = 'direct');

create index if not exists sales_tenant_canceled_at_idx
  on public.sales (tenant_id, canceled_at);

create index if not exists sale_items_gift_list_item_id_idx
  on public.sale_items (gift_list_item_id);

create or replace function public.cancel_sale_and_restore(
  target_tenant_id uuid,
  target_sale_id uuid
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row public.sales%rowtype;
  sale_item_row record;
begin
  select *
  into sale_row
  from public.sales
  where tenant_id = target_tenant_id
    and id = target_sale_id
  for update;

  if not found then
    raise exception 'Venda nao encontrada.';
  end if;

  if sale_row.canceled_at is not null then
    raise exception 'Venda ja cancelada.';
  end if;

  update public.sales
  set canceled_at = timezone('utc', now())
  where tenant_id = target_tenant_id
    and id = target_sale_id
  returning * into sale_row;

  for sale_item_row in
    select
      product_id,
      quantity,
      gift_list_item_id
    from public.sale_items
    where tenant_id = target_tenant_id
      and sale_id = target_sale_id
  loop
    if sale_item_row.product_id is not null then
      update public.products
      set stock_quantity = stock_quantity + sale_item_row.quantity
      where tenant_id = target_tenant_id
        and id = sale_item_row.product_id;
    end if;

    if sale_item_row.gift_list_item_id is not null then
      update public.gift_list_items
      set
        status = case
          when reserved_by_name is not null and btrim(reserved_by_name) <> '' then 'reservado'
          else 'disponivel'
        end,
        purchased_at = null
      where tenant_id = target_tenant_id
        and id = sale_item_row.gift_list_item_id;
    end if;
  end loop;

  if sale_row.origin_type = 'conditional' and sale_row.origin_id is not null then
    update public.conditionals
    set
      status = 'open',
      sale_id = null
    where tenant_id = target_tenant_id
      and id = sale_row.origin_id;

    update public.conditional_items
    set
      qty_sold = 0,
      qty_returned = 0
    where tenant_id = target_tenant_id
      and conditional_id = sale_row.origin_id;
  end if;

  return sale_row;
end;
$$;
