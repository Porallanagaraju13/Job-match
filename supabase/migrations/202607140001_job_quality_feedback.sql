-- Production job identity, freshness, and user relevance feedback.
create extension if not exists vector;

alter table public.jobs add column if not exists embedding vector(768);
alter table public.resume_extractions add column if not exists embedding vector(768);
create index if not exists jobs_embedding_idx
  on public.jobs using hnsw (embedding vector_cosine_ops);

create or replace function public.match_jobs(
  query_embedding vector(768),
  match_threshold double precision default 0.55,
  match_count integer default 20
)
returns table (id uuid, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select jobs.id, 1 - (jobs.embedding <=> query_embedding) as similarity
  from public.jobs as jobs
  where jobs.embedding is not null
    and jobs.closed_at is null
    and 1 - (jobs.embedding <=> query_embedding) >= match_threshold
  order by jobs.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;
end;
$$;

alter table public.jobs
  add column if not exists last_verified_at timestamptz not null default now(),
  add column if not exists verification_failures integer not null default 0;

-- Rebuild historical fingerprints from stable job attributes so the same
-- opening collected from multiple providers shares one identity.
update public.jobs as job
set fingerprint = encode(
  digest(
    concat_ws(
      '|',
      lower(regexp_replace(coalesce(company.normalized_name, ''), '[^a-z0-9]+', '', 'g')),
      lower(regexp_replace(coalesce(job.normalized_title, job.title), '[^a-z0-9]+', '', 'g')),
      lower(regexp_replace(coalesce(job.locations ->> 0, ''), '[^a-z0-9]+', '', 'g'))
    ),
    'sha256'
  ),
  'hex'
)
from public.companies as company
where company.id = job.company_id;

create temporary table job_duplicate_map on commit drop as
select id as duplicate_id, keeper_id
from (
  select
    id,
    first_value(id) over (partition by fingerprint order by created_at, id) as keeper_id
  from public.jobs
  where fingerprint <> ''
) ranked
where id <> keeper_id;

insert into public.job_matches (user_id, job_id, score, components, explanation, calculated_at)
select distinct on (match.user_id, duplicate.keeper_id)
  match.user_id,
  duplicate.keeper_id,
  match.score,
  match.components,
  match.explanation,
  match.calculated_at
from public.job_matches as match
join job_duplicate_map as duplicate on duplicate.duplicate_id = match.job_id
order by match.user_id, duplicate.keeper_id, match.score desc, match.calculated_at desc
on conflict (user_id, job_id) do update
set score = greatest(public.job_matches.score, excluded.score),
    components = case
      when excluded.score >= public.job_matches.score then excluded.components
      else public.job_matches.components
    end,
    explanation = case
      when excluded.score >= public.job_matches.score then excluded.explanation
      else public.job_matches.explanation
    end,
    calculated_at = greatest(public.job_matches.calculated_at, excluded.calculated_at);

delete from public.job_matches as match
using job_duplicate_map as duplicate
where match.job_id = duplicate.duplicate_id;

insert into public.saved_jobs (user_id, job_id, saved_at)
select saved.user_id, duplicate.keeper_id, saved.saved_at
from public.saved_jobs as saved
join job_duplicate_map as duplicate on duplicate.duplicate_id = saved.job_id
on conflict (user_id, job_id) do nothing;

delete from public.saved_jobs as saved
using job_duplicate_map as duplicate
where saved.job_id = duplicate.duplicate_id;

update public.applications as application
set job_id = duplicate.keeper_id
from job_duplicate_map as duplicate
where application.job_id = duplicate.duplicate_id;

delete from public.jobs as job
using job_duplicate_map as duplicate
where job.id = duplicate.duplicate_id;

drop index if exists public.jobs_fingerprint_idx;
create unique index if not exists jobs_fingerprint_unique_idx
  on public.jobs(fingerprint)
  where fingerprint <> '';
create index if not exists jobs_freshness_idx
  on public.jobs(last_verified_at desc)
  where closed_at is null;

create table if not exists public.job_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  feedback text not null check (feedback in ('relevant', 'not_relevant', 'hidden')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

drop trigger if exists set_job_feedback_updated_at on public.job_feedback;
create trigger set_job_feedback_updated_at
before update on public.job_feedback
for each row execute function public.set_updated_at();

alter table public.job_feedback enable row level security;
drop policy if exists "job_feedback_all_own" on public.job_feedback;
create policy "job_feedback_all_own" on public.job_feedback
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists job_feedback_user_value_idx
  on public.job_feedback(user_id, feedback, updated_at desc);

create table if not exists public.user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  retain_automation_recordings boolean not null default true,
  improve_personal_matching boolean not null default true,
  resume_retention_days integer not null default 365 check (resume_retention_days between 30 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_privacy_settings_updated_at on public.user_privacy_settings;
create trigger set_user_privacy_settings_updated_at
before update on public.user_privacy_settings
for each row execute function public.set_updated_at();

alter table public.user_privacy_settings enable row level security;
drop policy if exists "privacy_settings_all_own" on public.user_privacy_settings;
create policy "privacy_settings_all_own" on public.user_privacy_settings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  follow_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_notes_user_followup_idx
  on public.application_notes(user_id, follow_up_at, created_at desc);
drop trigger if exists set_application_notes_updated_at on public.application_notes;
create trigger set_application_notes_updated_at
before update on public.application_notes
for each row execute function public.set_updated_at();

alter table public.application_notes enable row level security;
drop policy if exists "application_notes_all_own" on public.application_notes;
create policy "application_notes_all_own" on public.application_notes
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
