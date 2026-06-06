-- Row Level Security Policies
-- All tables are private per user

alter table public.master_resumes enable row level security;
alter table public.job_applications enable row level security;
alter table public.tailored_resumes enable row level security;
alter table public.cover_letters enable row level security;
alter table public.ats_analyses enable row level security;
alter table public.interview_kits enable row level security;
alter table public.learning_roadmaps enable row level security;
alter table public.user_api_keys enable row level security;
alter table public.version_history enable row level security;
alter table public.audit_logs enable row level security;
alter table public.multi_jd_analyses enable row level security;

-- Helper
create or replace function public.is_owner(row_user_id uuid)
returns boolean language sql security definer as $$
  select auth.uid() = row_user_id;
$$;

-- Master Resumes
create policy "owner_all" on public.master_resumes
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Job Applications
create policy "owner_all" on public.job_applications
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Tailored Resumes
create policy "owner_all" on public.tailored_resumes
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Cover Letters
create policy "owner_all" on public.cover_letters
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- ATS Analyses
create policy "owner_all" on public.ats_analyses
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Interview Kits
create policy "owner_all" on public.interview_kits
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Learning Roadmaps
create policy "owner_all" on public.learning_roadmaps
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- API Keys
create policy "owner_all" on public.user_api_keys
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Version History
create policy "owner_all" on public.version_history
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Audit Logs (read + insert only — no update/delete)
create policy "owner_select" on public.audit_logs
  for select using (public.is_owner(user_id));
create policy "owner_insert" on public.audit_logs
  for insert with check (public.is_owner(user_id));

-- Multi-JD Analyses
create policy "owner_all" on public.multi_jd_analyses
  for all using (public.is_owner(user_id)) with check (public.is_owner(user_id));

-- Storage buckets (run separately in Supabase dashboard or via API)
-- bucket: resumes — private, max 10MB, pdf/docx/txt/md
-- bucket: exports — private, max 10MB, pdf/docx/txt
