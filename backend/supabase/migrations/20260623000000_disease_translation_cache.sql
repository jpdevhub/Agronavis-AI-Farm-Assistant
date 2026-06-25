-- Cache translated disease scan results to avoid repeated Google Translate API calls
create table if not exists disease_translations (
    id uuid primary key default gen_random_uuid(),
    class_name text not null,
    locale text not null,
    disease_name text not null,
    symptoms text[] not null,
    recommended_action text[] not null,
    created_at timestamptz not null default now(),
    unique (class_name, locale)
);

create index if not exists idx_disease_translations_lookup
    on disease_translations (class_name, locale);

alter table disease_translations enable row level security;

-- Read-only cache, any authenticated user can read translated entries
create policy "Allow authenticated read access"
    on disease_translations
    for select
    to authenticated
    using (true);

-- Only the backend service role writes to this cache
create policy "Allow service role write access"
    on disease_translations
    for insert
    to service_role
    with check (true);
