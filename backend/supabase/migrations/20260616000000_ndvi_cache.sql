create table if not exists ndvi_cache (
    id uuid primary key default gen_random_uuid(),
    farm_id uuid not null references farms(id) on delete cascade,
    date_from date not null,
    date_to date not null,
    ndvi_min numeric(6,4),
    ndvi_max numeric(6,4),
    ndvi_mean numeric(6,4),
    bbox jsonb,
    created_at timestamptz not null default now()
);

create index if not exists ndvi_cache_farm_id_idx on ndvi_cache(farm_id);
create index if not exists ndvi_cache_created_at_idx on ndvi_cache(created_at desc);
