-- Supabase SQL Editor에서 실행하세요
-- 기존 테이블이 있다면 먼저 삭제됩니다

drop table if exists todos;
drop table if exists groups;

-- ── 테이블 생성 ───────────────────────────────────────────

create table groups (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  color_index integer     not null,
  created_at  timestamptz not null default now()
);

create table todos (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  text         text        not null,
  description  text,
  group_id     uuid        references groups(id) on delete set null,
  done         boolean     not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── RLS 활성화 ────────────────────────────────────────────

alter table groups enable row level security;
alter table todos  enable row level security;

-- ── RLS 정책 (본인 데이터만 접근) ────────────────────────

create policy "user_own" on groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_own" on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
