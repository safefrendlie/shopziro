-- =====================================================================
-- SHOPZIRO  -  complete database setup for Supabase
-- Run this whole file once: Supabase Dashboard > SQL Editor > New query > Run.
-- It is safe to run again (it uses IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFILES (one per user; role = seller or buyer)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('seller','buyer')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  if r not in ('seller','buyer') then r := 'buyer'; end if;
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, r, nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- 2. SHOPS (live, public version) and SHOP_DRAFTS (private editing copy)
-- ---------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 2 and 80),
  category text not null default 'Other',
  city text,
  config jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  featured boolean not null default false,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  visit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shops_listing_idx on public.shops (published, created_at desc);
create index if not exists shops_name_idx on public.shops (lower(name));

create table if not exists public.shop_drafts (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sellers cannot give themselves featured status, a bigger plan, or fake ratings.
create or replace function public.protect_shop_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      new.featured := false; new.plan := 'free';
      new.rating_avg := 0; new.rating_count := 0; new.visit_count := 0;
    else
      new.owner_id := old.owner_id; new.slug := old.slug;
      new.featured := old.featured; new.plan := old.plan;
      new.rating_avg := old.rating_avg; new.rating_count := old.rating_count;
      new.visit_count := old.visit_count;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists shops_protect on public.shops;
create trigger shops_protect before insert or update on public.shops
  for each row execute function public.protect_shop_columns();

create or replace function public.is_shop_owner(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops s where s.id = p_shop and s.owner_id = auth.uid())
$$;

create or replace function public.shop_is_published(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops s where s.id = p_shop and s.published)
$$;

-- ---------------------------------------------------------------------
-- 3. PRODUCTS AND SERVICES
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  kind text not null default 'product' check (kind in ('product','service')),
  offer_type text not null default 'fixed' check (offer_type in ('fixed','custom','quote')),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  category text not null default 'General',
  price numeric(12,2) check (price is null or price >= 0),
  images text[] not null default '{}',
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock','limited','out_of_stock')),
  variations text[] not null default '{}',
  custom_fields text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (offer_type <> 'fixed' or price is not null)
);
create index if not exists products_shop_idx on public.products (shop_id, created_at desc);
create index if not exists products_name_idx on public.products (lower(name));

create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; cnt int; p text;
begin
  select plan into p from public.shops where id = new.shop_id;
  lim := case p when 'business' then 100000 when 'pro' then 1000 else 50 end;
  select count(*) into cnt from public.products where shop_id = new.shop_id;
  if cnt >= lim then
    raise exception 'Plan limit reached: your % plan allows % products or services.', p, lim;
  end if;
  return new;
end $$;
drop trigger if exists products_limit on public.products;
create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();

-- ---------------------------------------------------------------------
-- 4. ORDERS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','in_progress','completed','rejected','cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod','direct','whatsapp')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  customer_name text not null,
  customer_phone text not null,
  address text,
  notes text,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_shop_idx on public.orders (shop_id, created_at desc);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(12,2) not null,
  qty integer not null check (qty > 0),
  variation text
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Sellers may change status / payment status only; everything else on an order is locked.
create or replace function public.protect_order_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    new.shop_id := old.shop_id; new.buyer_id := old.buyer_id; new.total := old.total;
    new.customer_name := old.customer_name; new.customer_phone := old.customer_phone;
    new.address := old.address; new.notes := old.notes;
    new.payment_method := old.payment_method; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists orders_protect on public.orders;
create trigger orders_protect before update on public.orders
  for each row execute function public.protect_order_columns();

-- ---------------------------------------------------------------------
-- 5. ENQUIRIES (custom orders, quote requests, questions)
-- ---------------------------------------------------------------------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text,
  buyer_phone text,
  kind text not null check (kind in ('custom','quote','question')),
  details jsonb not null default '{}'::jsonb,
  message text,
  reference_image text,
  delivery_date date,
  quantity integer,
  status text not null default 'new' check (status in ('new','quoted','accepted','declined','closed')),
  quote_amount numeric(12,2),
  quote_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_shop_idx on public.enquiries (shop_id, created_at desc);
create index if not exists enquiries_buyer_idx on public.enquiries (buyer_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. REVIEWS, FAVOURITES, SAVED PRODUCTS, VISITS, NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  buyer_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  image_url text,
  verified boolean not null default true,
  seller_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (shop_id, buyer_id)
);

create table if not exists public.favorites (
  buyer_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, shop_id)
);

create table if not exists public.saved_products (
  buyer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, product_id)
);

create table if not exists public.shop_visits (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops(id) on delete cascade,
  source text not null default 'direct',
  created_at timestamptz not null default now()
);
create index if not exists shop_visits_idx on public.shop_visits (shop_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 7. TRIGGERS: ratings + notifications
-- ---------------------------------------------------------------------
create or replace function public.has_completed_order(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders
                 where shop_id = p_shop and buyer_id = auth.uid() and status = 'completed')
$$;

create or replace function public.refresh_shop_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  sid := coalesce(new.shop_id, old.shop_id);
  update public.shops set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where shop_id = sid), 0),
    rating_count = (select count(*) from public.reviews where shop_id = sid)
  where id = sid;
  return null;
end $$;
drop trigger if exists reviews_rating on public.reviews;
create trigger reviews_rating after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_shop_rating();

create or replace function public.protect_review_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    new.seller_reply := old.seller_reply; new.replied_at := old.replied_at;
    new.buyer_id := old.buyer_id; new.shop_id := old.shop_id; new.verified := old.verified;
  end if;
  return new;
end $$;
drop trigger if exists reviews_protect on public.reviews;
create trigger reviews_protect before update on public.reviews
  for each row execute function public.protect_review_columns();

create or replace function public.notify(p_user uuid, p_title text, p_body text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null then
    insert into public.notifications (user_id, title, body, link) values (p_user, p_title, p_body, p_link);
  end if;
end $$;
revoke all on function public.notify(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.trg_order_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner_id into o from public.shops where id = new.shop_id;
  perform public.notify(o, 'New order received', new.customer_name || ' just placed an order.', '/seller/orders');
  return new;
end $$;
drop trigger if exists orders_notify_insert on public.orders;
create trigger orders_notify_insert after insert on public.orders
  for each row execute function public.trg_order_insert();

create or replace function public.trg_order_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; sname text; msg text;
begin
  if new.status is distinct from old.status then
    select owner_id, name into o, sname from public.shops where id = new.shop_id;
    if auth.uid() is not distinct from new.buyer_id then
      if new.status = 'cancelled' then
        perform public.notify(o, 'Order cancelled', new.customer_name || ' cancelled an order.', '/seller/orders');
      end if;
    else
      msg := case new.status
        when 'accepted' then 'was accepted'
        when 'in_progress' then 'is being prepared'
        when 'completed' then 'is completed'
        when 'rejected' then 'was declined'
        when 'cancelled' then 'was cancelled'
        else 'was updated' end;
      perform public.notify(new.buyer_id, 'Order update', 'Your order from ' || sname || ' ' || msg || '.', '/buyer/orders');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_notify_update on public.orders;
create trigger orders_notify_update after update on public.orders
  for each row execute function public.trg_order_update();

create or replace function public.trg_enquiry_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner_id into o from public.shops where id = new.shop_id;
  perform public.notify(o,
    case new.kind when 'custom' then 'New custom order request' when 'quote' then 'New quote request' else 'New question' end,
    coalesce(new.buyer_name, 'A customer') || ' sent a request' || coalesce(' about ' || new.product_name, '') || '.',
    '/seller/enquiries');
  return new;
end $$;
drop trigger if exists enquiries_notify_insert on public.enquiries;
create trigger enquiries_notify_insert after insert on public.enquiries
  for each row execute function public.trg_enquiry_insert();

create or replace function public.trg_enquiry_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; sname text;
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists enquiries_touch on public.enquiries;
create trigger enquiries_touch before update on public.enquiries
  for each row execute function public.trg_enquiry_update();

create or replace function public.trg_enquiry_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; sname text;
begin
  if new.status is distinct from old.status then
    select owner_id, name into o, sname from public.shops where id = new.shop_id;
    if new.status = 'quoted' then
      perform public.notify(new.buyer_id, 'Quotation received', sname || ' sent you a quotation.', '/buyer/enquiries');
    elsif new.status = 'accepted' then
      perform public.notify(o, 'Quotation accepted', coalesce(new.buyer_name, 'A customer') || ' accepted your quotation.', '/seller/enquiries');
    elsif new.status = 'declined' then
      perform public.notify(o, 'Quotation declined', coalesce(new.buyer_name, 'A customer') || ' declined your quotation.', '/seller/enquiries');
    elsif new.status = 'closed' then
      perform public.notify(new.buyer_id, 'Request closed', sname || ' closed your request.', '/buyer/enquiries');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists enquiries_notify_status on public.enquiries;
create trigger enquiries_notify_status after update on public.enquiries
  for each row execute function public.trg_enquiry_status();

create or replace function public.trg_review_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner_id into o from public.shops where id = new.shop_id;
  perform public.notify(o, 'New review', coalesce(new.buyer_name, 'A customer') || ' left a ' || new.rating || '-star review.', '/seller/reviews');
  return new;
end $$;
drop trigger if exists reviews_notify_insert on public.reviews;
create trigger reviews_notify_insert after insert on public.reviews
  for each row execute function public.trg_review_insert();

create or replace function public.trg_review_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  if new.seller_reply is distinct from old.seller_reply and new.seller_reply is not null then
    select name into sname from public.shops where id = new.shop_id;
    perform public.notify(new.buyer_id, 'Seller replied', sname || ' replied to your review.', '/buyer/reviews');
  end if;
  return new;
end $$;
drop trigger if exists reviews_notify_reply on public.reviews;
create trigger reviews_notify_reply after update on public.reviews
  for each row execute function public.trg_review_reply();

-- ---------------------------------------------------------------------
-- 8. FUNCTIONS THE APP CALLS (RPC)
-- ---------------------------------------------------------------------
create or replace function public.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.shops where slug = lower(p_slug))
$$;

create or replace function public.track_visit(p_shop uuid, p_source text default 'direct') returns void
language plpgsql security definer set search_path = public as $$
declare src text;
begin
  if not exists (select 1 from public.shops where id = p_shop and published) then return; end if;
  src := left(regexp_replace(lower(coalesce(nullif(trim(p_source), ''), 'direct')), '[^a-z0-9_-]', '', 'g'), 30);
  if src = '' then src := 'direct'; end if;
  insert into public.shop_visits (shop_id, source) values (p_shop, src);
  update public.shops set visit_count = visit_count + 1 where id = p_shop;
end $$;

create or replace function public.place_order(
  p_shop uuid, p_name text, p_phone text, p_address text, p_notes text, p_payment text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod record; q int; n int := 0;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if coalesce(public.my_role(), 'buyer') <> 'buyer' then raise exception 'Only buyer accounts can place orders.'; end if;
  if not exists (select 1 from public.shops where id = p_shop and published) then
    raise exception 'This shop is not available.';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Name and phone number are required.';
  end if;
  if p_payment not in ('cod','direct','whatsapp') then p_payment := 'cod'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  insert into public.orders (shop_id, buyer_id, customer_name, customer_phone, address, notes, payment_method, total)
  values (p_shop, auth.uid(), trim(p_name), trim(p_phone), nullif(trim(p_address), ''), nullif(trim(p_notes), ''), p_payment, 0)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products
      where id = (it->>'product_id')::uuid and shop_id = p_shop and active
        and offer_type = 'fixed' and stock_status <> 'out_of_stock';
    if not found then raise exception 'One of the items is no longer available.'; end if;
    q := greatest(1, least(coalesce((it->>'qty')::int, 1), 99));
    insert into public.order_items (order_id, product_id, name, price, qty, variation)
    values (v_order, prod.id, prod.name, prod.price, q, nullif(it->>'variation', ''));
    v_total := v_total + prod.price * q;
    n := n + 1;
  end loop;

  if n = 0 then raise exception 'Your cart is empty.'; end if;
  update public.orders set total = v_total where id = v_order;
  return v_order;
end $$;

create or replace function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'cancelled'
   where id = p_order and buyer_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Only pending orders can be cancelled.'; end if;
end $$;

create or replace function public.respond_quote(p_enquiry uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.enquiries set status = case when p_accept then 'accepted' else 'declined' end
   where id = p_enquiry and buyer_id = auth.uid() and status = 'quoted';
  if not found then raise exception 'This quotation can no longer be answered.'; end if;
end $$;

create or replace function public.reply_review(p_review uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.reviews r set seller_reply = nullif(trim(p_reply), ''), replied_at = now()
   where r.id = p_review and public.is_shop_owner(r.shop_id);
  if not found then raise exception 'Review not found.'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (who can see / change what)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.shops          enable row level security;
alter table public.shop_drafts    enable row level security;
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.enquiries      enable row level security;
alter table public.reviews        enable row level security;
alter table public.favorites      enable row level security;
alter table public.saved_products enable row level security;
alter table public.shop_visits    enable row level security;
alter table public.notifications  enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

-- shops
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select using (published or owner_id = auth.uid());
drop policy if exists shops_insert on public.shops;
create policy shops_insert on public.shops for insert
  with check (owner_id = auth.uid() and public.my_role() = 'seller');
drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists shops_delete on public.shops;
create policy shops_delete on public.shops for delete using (owner_id = auth.uid());

-- shop drafts (owner only)
drop policy if exists drafts_all on public.shop_drafts;
create policy drafts_all on public.shop_drafts for all
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- products
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using ((active and public.shop_is_published(shop_id)) or public.is_shop_owner(shop_id));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert with check (public.is_shop_owner(shop_id));
drop policy if exists products_update on public.products;
create policy products_update on public.products for update
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete using (public.is_shop_owner(shop_id));

-- orders (created only through place_order; buyers read their own; owners manage theirs)
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (buyer_id = auth.uid() or public.is_shop_owner(shop_id));
drop policy if exists orders_update_owner on public.orders;
create policy orders_update_owner on public.orders for update
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select using (
  exists (select 1 from public.orders o
          where o.id = order_id and (o.buyer_id = auth.uid() or public.is_shop_owner(o.shop_id))));

-- enquiries
drop policy if exists enquiries_select on public.enquiries;
create policy enquiries_select on public.enquiries for select
  using (buyer_id = auth.uid() or public.is_shop_owner(shop_id));
drop policy if exists enquiries_insert on public.enquiries;
create policy enquiries_insert on public.enquiries for insert with check (
  buyer_id = auth.uid() and public.my_role() = 'buyer' and public.shop_is_published(shop_id)
  and status = 'new' and quote_amount is null);
drop policy if exists enquiries_update_owner on public.enquiries;
create policy enquiries_update_owner on public.enquiries for update
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- reviews (only buyers with a completed order can review)
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (public.shop_is_published(shop_id) or public.is_shop_owner(shop_id) or buyer_id = auth.uid());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (
  buyer_id = auth.uid() and public.has_completed_order(shop_id) and seller_reply is null);
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews for update
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews for delete using (buyer_id = auth.uid());

-- favourites and saved products
drop policy if exists favorites_all on public.favorites;
create policy favorites_all on public.favorites for all
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
drop policy if exists saved_all on public.saved_products;
create policy saved_all on public.saved_products for all
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

-- visits (written only by track_visit; owner can read for analytics)
drop policy if exists visits_select_owner on public.shop_visits;
create policy visits_select_owner on public.shop_visits for select using (public.is_shop_owner(shop_id));

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 10. REALTIME (instant in-app notifications and live order lists)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['notifications','orders','enquiries'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 11. IMAGE STORAGE (public bucket "media"; each user writes only to their own folder)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_insert_own on storage.objects;
create policy media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists media_update_own on storage.objects;
create policy media_update_own on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists media_delete_own on storage.objects;
create policy media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- OPTIONAL: make yourself the platform admin and feature a shop
--   update public.shops set featured = true where slug = 'your-shop-slug';
-- (Run it in the SQL editor; sellers cannot do this from the app.)
-- =====================================================================
