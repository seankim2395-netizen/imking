-- Server-only canonical graphs, member bindings and public invitation capabilities.
-- Never expose a full graph (including births/owner hashes) through the Data API.
create table public.imking_network_records (
 owner_id text primary key,
 world_json text not null check (octet_length(world_json) <= 8000000),
 revision bigint not null check (revision > 0),
 updated_at bigint not null
);
alter table public.imking_network_records enable row level security;
revoke all on public.imking_network_records from public, anon, authenticated;
grant select, insert, update, delete on public.imking_network_records to service_role;
comment on table public.imking_network_records is 'Canonical invitation graphs. Only royal-api verifies membership, redacts births and executes game commands.';
