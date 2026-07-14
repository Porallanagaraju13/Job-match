create extension if not exists pgcrypto;
do $$ begin create type public.onboarding_state as enum (
  'resume_required',
  'processing',
  'review_required',
  'preferences_required',
  'ready'
);
exception
when duplicate_object then null;
end $$;
do $$ begin create type public.resume_status as enum (
  'uploaded',
  'processing',
  'review_required',
  'ready',
  'failed',
  'archived'
);
exception
when duplicate_object then null;
end $$;
do $$ begin create type public.application_state as enum (
  'draft',
  'queued',
  'scanning',
  'needs_input',
  'ready_for_review',
  'submitting',
  'submitted',
  'needs_user_action',
  'failed',
  'cancelled'
);
exception
when duplicate_object then null;
end $$;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  headline text,
  summary text,
  avatar_url text,
  onboarding_state public.onboarding_state not null default 'resume_required',
  completeness smallint not null default 0 check (
    completeness between 0 and 100
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.job_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_roles text [] not null default '{}',
  preferred_locations text [] not null default '{}',
  work_modes text [] not null default '{}',
  seniority_levels text [] not null default '{}',
  salary_currency text not null default 'USD',
  minimum_salary integer,
  requires_sponsorship boolean,
  excluded_companies text [] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  years numeric(4, 1),
  confidence numeric(4, 3) check (
    confidence is null
    or confidence between 0 and 1
  ),
  source text not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, skill)
);
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  description text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (
    size_bytes > 0
    and size_bytes <= 8388608
  ),
  sha256 text,
  version integer not null default 1 check (version > 0),
  status public.resume_status not null default 'uploaded',
  is_active boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_active_resume_per_user on public.resumes(user_id)
where is_active;
create table if not exists public.resume_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  parser_version text not null,
  raw_data jsonb not null default '{}'::jsonb,
  confidence_map jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  domain text,
  logo_url text,
  careers_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name, domain)
);
create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  platform text not null,
  board_token text,
  source_url text not null,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, source_url)
);
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.job_sources(id) on delete cascade,
  company_id uuid references public.companies(id) on delete
  set null,
    external_id text not null,
    title text not null,
    normalized_title text not null,
    description text,
    locations jsonb not null default '[]'::jsonb,
    work_mode text,
    employment_type text,
    seniority text,
    salary_min integer,
    salary_max integer,
    salary_currency text,
    apply_url text not null,
    canonical_url text not null,
    tags text [] not null default '{}',
    source_payload jsonb not null default '{}'::jsonb,
    fingerprint text not null,
    posted_at timestamptz,
    source_updated_at timestamptz,
    closed_at timestamptz,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (source_id, external_id)
);
create index if not exists jobs_open_recent_idx on public.jobs(posted_at desc)
where closed_at is null;
create index if not exists jobs_title_idx on public.jobs(normalized_title);
create index if not exists jobs_fingerprint_idx on public.jobs(fingerprint);
create table if not exists public.job_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  score smallint not null check (
    score between 0 and 100
  ),
  components jsonb not null default '{}'::jsonb,
  explanation text [] not null default '{}',
  calculated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  notes text,
  saved_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create table if not exists public.platform_adapters (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  version text not null,
  capabilities jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  reliability_score numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, version)
);
create table if not exists public.form_schemas (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_fingerprint text not null,
  adapter_version text not null,
  schema jsonb not null,
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (platform, source_fingerprint, adapter_version)
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete restrict,
  resume_id uuid references public.resumes(id) on delete
  set null,
    mode text not null default 'assisted' check (mode in ('manual', 'assisted', 'automatic')),
    state public.application_state not null default 'draft',
    current_step text,
    idempotency_key text not null,
    provider_run_id text,
    confirmation_reference text,
    failure_code text,
    failure_message text,
    submitted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, idempotency_key)
);
create index if not exists applications_user_state_idx on public.applications(user_id, state, updated_at desc);
create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  field_key text not null,
  label text not null,
  value jsonb,
  source text not null,
  confidence numeric(4, 3) check (
    confidence is null
    or confidence between 0 and 1
  ),
  user_confirmed boolean not null default false,
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, field_key)
);
create table if not exists public.application_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  event_type text not null,
  from_state public.application_state,
  to_state public.application_state,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.application_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  artifact_type text not null,
  storage_path text,
  provider_reference text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.plans (
  code text primary key,
  name text not null,
  stripe_price_id text,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  entitlements jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.plans (code, name, monthly_price_cents, entitlements)
values (
    'free',
    'Free',
    0,
    '{"job_results_daily": 10, "assisted_applications_monthly": 3}'::jsonb
  ),
  (
    'pro',
    'Pro',
    1900,
    '{"job_results_daily": null, "assisted_applications_monthly": 30}'::jsonb
  ),
  (
    'power',
    'Power',
    4900,
    '{"job_results_daily": null, "assisted_applications_monthly": 100}'::jsonb
  ) on conflict (code) do
update
set name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  entitlements = excluded.entitlements,
  updated_at = now();
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_type text not null,
  quantity integer not null check (quantity <> 0),
  idempotency_key text not null unique,
  application_id uuid references public.applications(id) on delete
  set null,
    metadata jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default now()
);
create index if not exists usage_ledger_user_period_idx on public.usage_ledger(user_id, usage_type, occurred_at desc);
create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processing_state text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);
create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user_recent_idx on public.activity_events(user_id, created_at desc);
create or replace function public.set_updated_at() returns trigger language plpgsql security invoker
set search_path = '' as $$ begin new.updated_at = now();
return new;
end;
$$;
do $$
declare table_name text;
begin foreach table_name in array array [
    'profiles', 'job_preferences', 'experiences', 'educations', 'resumes',
    'companies', 'job_sources', 'jobs', 'platform_adapters', 'applications',
    'application_answers', 'plans', 'subscriptions'
  ] loop execute format(
  'drop trigger if exists set_%I_updated_at on public.%I',
  table_name,
  table_name
);
execute format(
  'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
  table_name,
  table_name
);
end loop;
end;
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer
set search_path = '' as $$ begin
insert into public.profiles (id, full_name, email)
values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    new.email
  ) on conflict (id) do nothing;
insert into public.subscriptions (user_id, plan_code, status)
values (new.id, 'free', 'active') on conflict (user_id) do nothing;
return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute function public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.job_preferences enable row level security;
alter table public.profile_skills enable row level security;
alter table public.experiences enable row level security;
alter table public.educations enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_extractions enable row level security;
alter table public.companies enable row level security;
alter table public.job_sources enable row level security;
alter table public.jobs enable row level security;
alter table public.job_matches enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.platform_adapters enable row level security;
alter table public.form_schemas enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_events enable row level security;
alter table public.application_artifacts enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.stripe_events enable row level security;
alter table public.activity_events enable row level security;
create policy "profiles_select_own" on public.profiles for
select to authenticated using (
    (
      select auth.uid()
    ) = id
  );
create policy "profiles_update_own" on public.profiles for
update to authenticated using (
    (
      select auth.uid()
    ) = id
  ) with check (
    (
      select auth.uid()
    ) = id
  );
create policy "preferences_all_own" on public.job_preferences for all to authenticated using (
  (
    select auth.uid()
  ) = user_id
) with check (
  (
    select auth.uid()
  ) = user_id
);
create policy "skills_all_own" on public.profile_skills for all to authenticated using (
  (
    select auth.uid()
  ) = user_id
) with check (
  (
    select auth.uid()
  ) = user_id
);
create policy "experiences_all_own" on public.experiences for all to authenticated using (
  (
    select auth.uid()
  ) = user_id
) with check (
  (
    select auth.uid()
  ) = user_id
);
create policy "educations_all_own" on public.educations for all to authenticated using (
  (
    select auth.uid()
  ) = user_id
) with check (
  (
    select auth.uid()
  ) = user_id
);
create policy "resumes_select_own" on public.resumes for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "resumes_insert_own" on public.resumes for
insert to authenticated with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "resumes_update_own" on public.resumes for
update to authenticated using (
    (
      select auth.uid()
    ) = user_id
  ) with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "resumes_delete_own" on public.resumes for delete to authenticated using (
  (
    select auth.uid()
  ) = user_id
);
create policy "resume_extractions_select_own" on public.resume_extractions for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "companies_read_authenticated" on public.companies for
select to authenticated using (true);
create policy "sources_read_authenticated" on public.job_sources for
select to authenticated using (status = 'active');
create policy "jobs_read_authenticated" on public.jobs for
select to authenticated using (true);
create policy "plans_read" on public.plans for
select to anon,
  authenticated using (active);
create policy "matches_select_own" on public.job_matches for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "saved_jobs_all_own" on public.saved_jobs for all to authenticated using (
  (
    select auth.uid()
  ) = user_id
) with check (
  (
    select auth.uid()
  ) = user_id
);
create policy "applications_select_own" on public.applications for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "applications_insert_own" on public.applications for
insert to authenticated with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "applications_update_own" on public.applications for
update to authenticated using (
    (
      select auth.uid()
    ) = user_id
  ) with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "application_answers_select_own" on public.application_answers for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "application_answers_insert_own" on public.application_answers for
insert to authenticated with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "application_answers_update_own" on public.application_answers for
update to authenticated using (
    (
      select auth.uid()
    ) = user_id
  ) with check (
    (
      select auth.uid()
    ) = user_id
  );
create policy "application_events_select_own" on public.application_events for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "application_artifacts_select_own" on public.application_artifacts for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "subscriptions_select_own" on public.subscriptions for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "usage_select_own" on public.usage_ledger for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
create policy "activity_select_own" on public.activity_events for
select to authenticated using (
    (
      select auth.uid()
    ) = user_id
  );
insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values (
    'resumes',
    'resumes',
    false,
    8388608,
    array [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  ) on conflict (id) do
update
set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "resume_objects_select_own" on storage.objects for
select to authenticated using (
    bucket_id = 'resumes'
    and (storage.foldername(name)) [1] = (
      select auth.uid()
    )::text
  );
create policy "resume_objects_insert_own" on storage.objects for
insert to authenticated with check (
    bucket_id = 'resumes'
    and (storage.foldername(name)) [1] = (
      select auth.uid()
    )::text
  );
create policy "resume_objects_update_own" on storage.objects for
update to authenticated using (
    bucket_id = 'resumes'
    and (storage.foldername(name)) [1] = (
      select auth.uid()
    )::text
  ) with check (
    bucket_id = 'resumes'
    and (storage.foldername(name)) [1] = (
      select auth.uid()
    )::text
  );
create policy "resume_objects_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'resumes'
  and (storage.foldername(name)) [1] = (
    select auth.uid()
  )::text
);
-- 1. Enable pgvector
create extension if not exists vector;
-- 2. Add embeddings to jobs table
alter table public.jobs
add column if not exists embedding vector(768);
create index if not exists jobs_embedding_idx on public.jobs using hnsw (embedding vector_cosine_ops);
-- 3. Add embeddings to resume_extractions
alter table public.resume_extractions
add column if not exists embedding vector(768);
-- 4. Enable realtime on applications table for WebSockets
alter publication supabase_realtime
add table public.applications;
-- 5. Create match function for semantic job matching
create or replace function match_jobs (
    query_embedding vector(768),
    match_threshold float,
    match_count int
  ) returns table (id uuid, similarity float) language sql stable as $$
select jobs.id,
  1 - (jobs.embedding <=> query_embedding) as similarity
from public.jobs
where 1 - (jobs.embedding <=> query_embedding) > match_threshold
  and jobs.closed_at is null
order by jobs.embedding <=> query_embedding
limit match_count;
$$;