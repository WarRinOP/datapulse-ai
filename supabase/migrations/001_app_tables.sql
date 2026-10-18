-- DataPulse app tables (additive and idempotent). RLS is on with no public policies.
create table if not exists dp_analyses (
  id               uuid primary key default gen_random_uuid(),
  filename         text not null,
  file_type        text not null check (file_type in ('csv','xlsx','xls')),
  row_count        integer not null default 0,
  column_count     integer not null default 0,
  columns          jsonb not null default '[]'::jsonb,
  data_preview     jsonb not null default '[]'::jsonb,
  full_data        jsonb not null default '[]'::jsonb,
  narrative        text,
  key_metrics      jsonb not null default '[]'::jsonb,
  chart_configs    jsonb not null default '[]'::jsonb,
  recommendations  jsonb not null default '[]'::jsonb,
  session_id       text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_dp_analyses_created on dp_analyses (created_at desc);
create index if not exists idx_dp_analyses_session on dp_analyses (session_id);

create table if not exists dp_qa_messages (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references dp_analyses (id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dp_qa_analysis on dp_qa_messages (analysis_id, created_at);

alter table dp_analyses enable row level security;
alter table dp_qa_messages enable row level security;
