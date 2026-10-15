-- No public SELECT policy: births, charts and recovery records stay private.
create table if not exists public.imking_worlds (
 owner_id text primary key check (owner_id ~ '^guest-v1-[0-9a-f]{64}$'),
 world_json text not null check (octet_length(world_json) <= 600000),
 revision bigint not null check (revision > 0),
 updated_at bigint not null
);
alter table public.imking_worlds enable row level security;
revoke all on public.imking_worlds from public, anon, authenticated;
grant select, insert, update, delete on public.imking_worlds to service_role;
comment on table public.imking_worlds is 'Private per-browser prototype worlds. Only the token-verifying royal-api function may access these rows.';
