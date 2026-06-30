-- Supabase SQL Editor에서 실행하세요

-- ── 테이블 생성 ───────────────────────────────────────────

create table groups (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  color_index integer     not null,
  created_at  timestamptz not null default now()
);

create table todos (
  id           uuid        primary key default gen_random_uuid(),
  text         text        not null,
  description  text,
  group_id     uuid        references groups(id) on delete set null,
  done         boolean     not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── RLS 활성화 ────────────────────────────────────────────

alter table groups enable row level security;
alter table todos enable row level security;

-- ── RLS 정책 (인증 없이 전체 허용) ───────────────────────

create policy "anon_all" on groups for all to anon using (true) with check (true);
create policy "anon_all" on todos  for all to anon using (true) with check (true);
