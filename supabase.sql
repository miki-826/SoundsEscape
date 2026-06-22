-- sound escape — スコア記録テーブル
-- Supabase の SQL Editor で実行する。未設定でもアプリは LocalStorage で動作する。

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'ANON',
  item_name text not null,
  score int not null,
  rank text not null,
  badge text,
  success boolean not null default false,
  seed text,
  mode text,
  demo boolean not null default false,
  created_at timestamptz default now()
);

alter table results enable row level security;

-- 匿名プレイのため anon に insert / select を明示許可する。
-- （RLS有効＋ポリシー未設定だと全アクセスが拒否され「保存されない」事故になる）
drop policy if exists "anon insert results" on results;
create policy "anon insert results" on results
  for insert to anon with check (true);

drop policy if exists "anon select results" on results;
create policy "anon select results" on results
  for select to anon using (true);

create index if not exists results_score_idx on results (score desc);
