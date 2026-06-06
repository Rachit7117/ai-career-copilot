-- AI Career Copilot — Initial Schema
-- Run this in Supabase SQL Editor

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Master Resumes
-- ─────────────────────────────────────────────
create table public.master_resumes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  file_url      text,
  file_type     text check (file_type in ('pdf','docx','txt','md','gdocs')),
  raw_content   text,
  parsed_content jsonb,           -- structured: summary, experience[], skills[], education[], etc.
  is_active     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Job Applications
-- ─────────────────────────────────────────────
create table public.job_applications (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  company_name          text not null,
  job_title             text not null,
  job_url               text,
  job_description       text not null,
  job_description_parsed jsonb,
  master_resume_id      uuid references public.master_resumes(id) on delete set null,
  status                text not null default 'draft'
    check (status in ('draft','ready','applied','screening','interview_scheduled','interview_r1','interview_r2','offer','rejected','withdrawn')),
  -- optional
  recruiter_name        text,
  recruiter_linkedin    text,
  hiring_manager_name   text,
  location              text,
  compensation_range    text,
  application_deadline  date,
  notes                 text,
  -- computed scores (stored after AI analysis)
  ats_score             numeric(5,2),
  skill_match_score     numeric(5,2),
  experience_match_score numeric(5,2),
  overall_match_score   numeric(5,2),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Tailored Resumes
-- ─────────────────────────────────────────────
create table public.tailored_resumes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  application_id   uuid references public.job_applications(id) on delete cascade not null,
  master_resume_id uuid references public.master_resumes(id) on delete set null,
  version_type     text check (version_type in ('ats','recruiter','impact')),
  content          jsonb,           -- structured resume object
  content_md       text,            -- markdown render
  version_number   integer not null default 1,
  is_current       boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Cover Letters
-- ─────────────────────────────────────────────
create table public.cover_letters (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  application_id uuid references public.job_applications(id) on delete cascade not null,
  content        text not null,
  content_html   text,
  version_number integer not null default 1,
  is_current     boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ATS Analyses
-- ─────────────────────────────────────────────
create table public.ats_analyses (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid references auth.users(id) on delete cascade not null,
  application_id          uuid references public.job_applications(id) on delete cascade not null,
  tailored_resume_id      uuid references public.tailored_resumes(id) on delete set null,
  ats_score               numeric(5,2),
  skill_match_score       numeric(5,2),
  experience_match_score  numeric(5,2),
  overall_match_score     numeric(5,2),
  matched_keywords        text[],
  missing_keywords        text[],
  recommendations         text[],
  full_analysis           jsonb,
  created_at              timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Interview Kits
-- ─────────────────────────────────────────────
create table public.interview_kits (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references auth.users(id) on delete cascade not null,
  application_id           uuid references public.job_applications(id) on delete cascade not null,
  recruiter_questions      jsonb,
  hiring_manager_questions jsonb,
  technical_questions      jsonb,
  behavioral_questions     jsonb,
  case_questions           jsonb,
  star_stories             jsonb,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Learning Roadmaps
-- ─────────────────────────────────────────────
create table public.learning_roadmaps (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  application_id uuid references public.job_applications(id) on delete cascade not null,
  skill_gaps     jsonb,   -- [{skill, importance, gap_reason}]
  roadmap        jsonb,   -- [{skill, why, priority, effort_days, resources:[]}]
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─────────────────────────────────────────────
-- User API Keys (encrypted)
-- ─────────────────────────────────────────────
create table public.user_api_keys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  provider      text not null
    check (provider in ('openai','claude','gemini','deepseek','kimi','openrouter','groq')),
  encrypted_key text not null,
  key_hint      text,           -- last 4 chars for display
  is_active     boolean default true,
  last_tested_at timestamptz,
  test_status   text check (test_status in ('success','failed')),
  model_override text,          -- optional default model for this provider
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

-- ─────────────────────────────────────────────
-- Version History
-- ─────────────────────────────────────────────
create table public.version_history (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  entity_type    text not null check (entity_type in ('tailored_resume','cover_letter','master_resume')),
  entity_id      uuid not null,
  version_number integer not null,
  content        jsonb not null,
  diff_summary   text,
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Audit Logs
-- ─────────────────────────────────────────────
create table public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  action      text not null,   -- e.g. 'application.created', 'resume.generated'
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  inet,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Multi-JD Analysis
-- ─────────────────────────────────────────────
create table public.multi_jd_analyses (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  application_ids       uuid[],
  opportunity_ranking   jsonb,
  common_skill_gaps     jsonb,
  common_keywords       text[],
  resume_recommendations jsonb,
  created_at            timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index idx_master_resumes_user_id on public.master_resumes(user_id);
create index idx_job_applications_user_id on public.job_applications(user_id);
create index idx_job_applications_status on public.job_applications(status);
create index idx_tailored_resumes_application_id on public.tailored_resumes(application_id);
create index idx_cover_letters_application_id on public.cover_letters(application_id);
create index idx_ats_analyses_application_id on public.ats_analyses(application_id);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_version_history_entity on public.version_history(entity_type, entity_id);

-- ─────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_master_resumes_updated_at
  before update on public.master_resumes
  for each row execute procedure public.handle_updated_at();

create trigger trg_job_applications_updated_at
  before update on public.job_applications
  for each row execute procedure public.handle_updated_at();

create trigger trg_tailored_resumes_updated_at
  before update on public.tailored_resumes
  for each row execute procedure public.handle_updated_at();

create trigger trg_cover_letters_updated_at
  before update on public.cover_letters
  for each row execute procedure public.handle_updated_at();

create trigger trg_interview_kits_updated_at
  before update on public.interview_kits
  for each row execute procedure public.handle_updated_at();

create trigger trg_learning_roadmaps_updated_at
  before update on public.learning_roadmaps
  for each row execute procedure public.handle_updated_at();

create trigger trg_user_api_keys_updated_at
  before update on public.user_api_keys
  for each row execute procedure public.handle_updated_at();
