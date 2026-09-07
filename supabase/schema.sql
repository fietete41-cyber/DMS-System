-- =============================================================================
-- DMS – โครงสร้างฐานข้อมูล Supabase (รันครั้งเดียวใน SQL Editor)
-- =============================================================================

-- ---------- ตาราง ----------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  name        text default '',
  role        text not null default 'user' check (role in ('admin','user')),
  status      text not null default 'Active',
  created_at  timestamptz not null default now()
);

create table if not exists public.documents (
  id                  uuid primary key default gen_random_uuid(),
  type                text,
  no                  text default '',
  title               text default '',
  doc_date            text default '',          -- เก็บเป็นข้อความ (YYYY-MM-DD) เหมือนของเดิม
  from_to             text default '',
  department          text default '',
  sub_department      text default '',
  file_url            text default '',
  status              text default 'ใหม่',
  created_by          text default '',
  assignee            text default '',
  due_date            text default '',
  followup_note       text default '',
  user_status         text default '',
  user_status_reason  text default '',
  user_status_by      text default '',
  user_status_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  doc_id      text default '',
  message     text default '',
  type        text default 'assignment',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  at          timestamptz not null default now(),
  username    text,
  action      text,
  description text
);

create table if not exists public.settings (
  id    text primary key,
  data  jsonb not null default '{}'::jsonb
);

create index if not exists documents_created_at_idx on public.documents (created_at desc);
create index if not exists notifications_user_idx    on public.notifications (username, created_at desc);

-- ---------- ฟังก์ชันช่วย (security definer = ข้าม RLS ป้องกัน recursion) ----------
create or replace function public.current_username()
returns text language sql stable security definer set search_path = public as $$
  select username from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and coalesce(status,'Active') <> 'Inactive'
  )
$$;

create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and coalesce(status,'Active') <> 'Inactive'
  )
$$;

-- ---------- trigger กัน updated_at ค้าง ----------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();

-- ---------- RPC: ผู้ใช้ทั่วไปอัปเดตสถานะการดำเนินการ + แจ้งเตือนแอดมิน ----------
create or replace function public.rpc_update_user_doc_status(
  p_doc_id uuid, p_status text, p_reason text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me    text := public.current_username();
  v_name  text;
  v_reason text := coalesce(btrim(p_reason), '');
  v_doc   public.documents%rowtype;
  v_at    timestamptz := now();
  v_msg   text;
  r       record;
begin
  if v_me is null then raise exception 'ไม่พบผู้ใช้งาน'; end if;
  if p_status not in ('รับทราบ','กำลังดำเนินการ','ดำเนินการเสร็จสิ้นแล้ว','ไม่สามารถดำเนินการได้') then
    raise exception 'สถานะไม่ถูกต้อง';
  end if;
  if p_status = 'ไม่สามารถดำเนินการได้' and v_reason = '' then
    raise exception 'กรุณาระบุเหตุผลที่ไม่สามารถดำเนินการได้';
  end if;

  select * into v_doc from public.documents where id = p_doc_id;
  if not found then raise exception 'ไม่พบเอกสาร'; end if;

  update public.documents
     set user_status = p_status, user_status_reason = v_reason,
         user_status_by = v_me, user_status_at = v_at
   where id = p_doc_id;

  select name into v_name from public.users where username = v_me;
  v_msg := coalesce(v_name, v_me) || ' อัปเดตสถานะเอกสาร ' || coalesce(v_doc.no,'')
           || ' — ' || coalesce(v_doc.title,'') || ' เป็น "' || p_status || '"';
  if v_reason <> '' then v_msg := v_msg || ' (เหตุผล: ' || v_reason || ')'; end if;

  for r in
    select distinct u as username from (
      select v_doc.created_by as u
      union
      select username from public.users where role = 'admin' and coalesce(status,'Active') <> 'Inactive'
    ) t where u is not null and u <> '' and u <> v_me
  loop
    insert into public.notifications(username, doc_id, message, type)
    values (r.username, p_doc_id::text, v_msg, 'user-status');
  end loop;

  insert into public.logs(username, action, description)
  values (v_me, 'USER_STATUS', coalesce(v_doc.no,'') || ': ' || p_status ||
          case when v_reason <> '' then ' — ' || v_reason else '' end);

  return json_build_object(
    'status','success','userStatus',p_status,'userStatusReason',v_reason,
    'userStatusBy',v_me,'userStatusAt', to_char(v_at,'YYYY-MM-DD"T"HH24:MI:SS')
  );
end $$;

-- ---------- สิทธิ์ + RLS ------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.rpc_update_user_doc_status(uuid,text,text) to authenticated;

alter table public.users         enable row level security;
alter table public.documents     enable row level security;
alter table public.notifications enable row level security;
alter table public.logs          enable row level security;
alter table public.settings      enable row level security;

-- users : อ่านของตัวเอง / แอดมินอ่าน-แก้ทั้งหมด (การ"เพิ่มผู้ใช้" ทำผ่าน Edge Function)
drop policy if exists users_select on public.users;
create policy users_select on public.users for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists users_write on public.users;
create policy users_write on public.users for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists users_delete on public.users;
create policy users_delete on public.users for delete using (public.is_admin());

-- documents : ผู้ใช้ที่ยัง active อ่านได้ / แอดมินเขียนได้ / ผู้ใช้อัปเดตสถานะผ่าน RPC
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select using (public.is_active());
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert with check (public.is_admin());
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete using (public.is_admin());

-- notifications : เห็นเฉพาะของตัวเอง / แอดมินเป็นผู้สร้าง (assignment) / RPC สร้าง (user-status)
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select
  using (username = public.current_username());
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check (public.is_admin());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update
  using (username = public.current_username()) with check (username = public.current_username());
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete using (public.is_admin());

-- logs : แอดมินอ่าน / ผู้ล็อกอินเขียนได้
drop policy if exists logs_select on public.logs;
create policy logs_select on public.logs for select using (public.is_admin());
drop policy if exists logs_insert on public.logs;
create policy logs_insert on public.logs for insert with check (auth.uid() is not null);

-- settings : อ่านได้ทั่วไป (ใช้ธีม/โลโก้/ชื่อหน่วยงานตั้งแต่หน้าล็อกอิน) / แอดมินแก้
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ค่าเริ่มต้นของ settings
insert into public.settings(id, data) values
  ('system', '{"orgName":"","theme":"graysunset","logoUrl":""}'::jsonb)
  on conflict (id) do nothing;
