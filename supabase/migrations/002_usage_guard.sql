-- Usage guard for dp (additive and idempotent).
-- One counter table plus four server-only functions. The API calls these with
-- the service role key; browser (anon) access is revoked.

create table if not exists dp_usage_limits (
  key        text primary key,            -- dev:<id> | ip:<addr> | global:<day> | admin:<day> | adminfail:<ip>:<hour>
  used       integer     not null default 0 check (used >= 0),
  updated_at timestamptz not null default now()
);

alter table dp_usage_limits enable row level security;
revoke all on dp_usage_limits from anon, authenticated;

-- Check and consume one use in a single transaction.
create or replace function dp_consume_quota(
  p_device text, p_ip text, p_limit int, p_global_limit int,
  p_admin boolean, p_admin_ceiling int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_day  text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_dev  int;
  v_ip   int;
  v_glob int;
  v_adm  int;
begin
  -- Serialise all quota decisions so parallel requests cannot all slip under the cap.
  perform pg_advisory_xact_lock(hashtext('dp_quota'));

  if p_admin then
    v_adm := coalesce((select used from dp_usage_limits where key = 'admin:' || v_day), 0);
    if v_adm >= p_admin_ceiling then
      return jsonb_build_object('allowed', false, 'reason', 'admin_ceiling');
    end if;
    insert into dp_usage_limits (key, used) values ('admin:' || v_day, 1)
      on conflict (key) do update set used = dp_usage_limits.used + 1, updated_at = now();
    return jsonb_build_object('allowed', true, 'reason', 'admin', 'device_used', 0, 'ip_used', 0);
  end if;

  v_dev  := coalesce((select used from dp_usage_limits where key = 'dev:'    || p_device), 0);
  v_ip   := coalesce((select used from dp_usage_limits where key = 'ip:'     || p_ip), 0);
  v_glob := coalesce((select used from dp_usage_limits where key = 'global:' || v_day), 0);

  if v_dev >= p_limit then
    return jsonb_build_object('allowed', false, 'reason', 'device', 'device_used', v_dev, 'ip_used', v_ip);
  end if;
  if v_ip >= p_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip', 'device_used', v_dev, 'ip_used', v_ip);
  end if;
  if v_glob >= p_global_limit then
    return jsonb_build_object('allowed', false, 'reason', 'global', 'device_used', v_dev, 'ip_used', v_ip);
  end if;

  insert into dp_usage_limits (key, used) values ('dev:' || p_device, 1)
    on conflict (key) do update set used = dp_usage_limits.used + 1, updated_at = now();
  insert into dp_usage_limits (key, used) values ('ip:' || p_ip, 1)
    on conflict (key) do update set used = dp_usage_limits.used + 1, updated_at = now();
  insert into dp_usage_limits (key, used) values ('global:' || v_day, 1)
    on conflict (key) do update set used = dp_usage_limits.used + 1, updated_at = now();

  return jsonb_build_object('allowed', true, 'reason', 'ok', 'device_used', v_dev + 1, 'ip_used', v_ip + 1);
end $$;

-- Give one use back when the paid call failed before producing a result.
create or replace function dp_refund_quota(p_device text, p_ip text, p_admin boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_day text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  perform pg_advisory_xact_lock(hashtext('dp_quota'));
  if p_admin then
    update dp_usage_limits set used = greatest(used - 1, 0), updated_at = now()
      where key = 'admin:' || v_day;
  else
    update dp_usage_limits set used = greatest(used - 1, 0), updated_at = now()
      where key in ('dev:' || p_device, 'ip:' || p_ip, 'global:' || v_day);
  end if;
end $$;

-- Admin tools: set this device and address to the full limit or back to zero.
create or replace function dp_set_quota(p_device text, p_ip text, p_value int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('dp_quota'));
  insert into dp_usage_limits (key, used) values ('dev:' || p_device, greatest(p_value, 0))
    on conflict (key) do update set used = greatest(p_value, 0), updated_at = now();
  insert into dp_usage_limits (key, used) values ('ip:' || p_ip, greatest(p_value, 0))
    on conflict (key) do update set used = greatest(p_value, 0), updated_at = now();
end $$;

-- Counts one event against a limit (used to throttle wrong admin codes). Atomic.
create or replace function dp_hit_limit(p_key text, p_limit int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v int;
begin
  insert into dp_usage_limits (key, used) values (p_key, 1)
    on conflict (key) do update set used = dp_usage_limits.used + 1, updated_at = now()
    where dp_usage_limits.used < p_limit
    returning used into v;
  return v is not null;
end $$;

-- Functions are exposed over the REST API by default. Lock them to the server.
revoke all on function dp_consume_quota(text, text, int, int, boolean, int) from public, anon, authenticated;
revoke all on function dp_refund_quota(text, text, boolean) from public, anon, authenticated;
revoke all on function dp_set_quota(text, text, int) from public, anon, authenticated;
revoke all on function dp_hit_limit(text, int) from public, anon, authenticated;
grant execute on function dp_consume_quota(text, text, int, int, boolean, int) to service_role;
grant execute on function dp_refund_quota(text, text, boolean) to service_role;
grant execute on function dp_set_quota(text, text, int) to service_role;
grant execute on function dp_hit_limit(text, int) to service_role;

-- The old per-session counter table is no longer used for limits. Make sure the
-- public (anon) key can never read or reset it from a browser.
do $$
begin
  if to_regclass('public.dp_sessions') is not null then
    execute 'alter table public.dp_sessions enable row level security';
    execute 'revoke all on public.dp_sessions from anon, authenticated';
  end if;
end $$;
