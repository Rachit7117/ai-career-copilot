/**
 * Type-safe API client for the FastAPI backend.
 * All requests include the Supabase access token automatically.
 */
import { createClient } from "./supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

// ─── Resumes ──────────────────────────────────────────────
export const resumesApi = {
  list: () => request<MasterResume[]>("GET", "/resumes/"),
  get: (id: string) => request<MasterResume>("GET", `/resumes/${id}`),
  upload: (name: string, file: File) => {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("file", file);
    return upload<MasterResume>("/resumes/", fd);
  },
  update: (id: string, data: Partial<MasterResume>) => request<MasterResume>("PATCH", `/resumes/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/resumes/${id}`),
  reparse: (id: string) => request<MasterResume>("POST", `/resumes/${id}/reparse`),
  setActive: (id: string) => request<MasterResume>("PATCH", `/resumes/${id}`, { is_active: true }),
};

// ─── Applications ─────────────────────────────────────────
export const applicationsApi = {
  list: (status?: string) => request<JobApplication[]>("GET", `/applications/${status ? `?status=${status}` : ""}`),
  get: (id: string) => request<JobApplication>("GET", `/applications/${id}`),
  getFull: (id: string) => request<ApplicationFull>("GET", `/applications/${id}/full`),
  create: (data: CreateApplicationInput) => request<JobApplication>("POST", "/applications/", data),
  update: (id: string, data: Partial<JobApplication>) => request<JobApplication>("PATCH", `/applications/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/applications/${id}`),
};

// ─── AI ───────────────────────────────────────────────────
export const aiApi = {
  generateResume: (applicationId: string, versionType: "ats" | "recruiter" | "impact") =>
    request<TailoredResume>("POST", "/ai/generate-resume", { application_id: applicationId, version_type: versionType }),
  generateCoverLetter: (applicationId: string) =>
    request<CoverLetter>("POST", "/ai/generate-cover-letter", { application_id: applicationId }),
  atsAnalysis: (applicationId: string, tailoredResumeId?: string) =>
    request<ATSAnalysis>("POST", "/ai/ats-analysis", { application_id: applicationId, tailored_resume_id: tailoredResumeId }),
  skillGap: (applicationId: string) =>
    request<SkillGapAnalysis>("POST", "/ai/skill-gap", { application_id: applicationId }),
  interviewKit: (applicationId: string) =>
    request<InterviewKit>("POST", "/ai/interview-kit", { application_id: applicationId }),
  learningRoadmap: (applicationId: string) =>
    request<LearningRoadmap>("POST", "/ai/learning-roadmap", { application_id: applicationId }),
  multiJD: (applicationIds: string[], masterResumeId: string) =>
    request<MultiJDAnalysis>("POST", "/ai/multi-jd", { application_ids: applicationIds, master_resume_id: masterResumeId }),
  rewrite: (applicationId: string, content: string, instruction: string) =>
    request<{ result: string }>("POST", "/ai/rewrite", { application_id: applicationId, content, instruction }),
};

// ─── Export ───────────────────────────────────────────────
export async function downloadExport(entityType: string, entityId: string, format: string) {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}/export/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ entity_type: entityType, entity_id: entityId, format }),
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ext = format;
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="(.+)"/);
  a.download = match?.[1] || `export.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Settings ─────────────────────────────────────────────
export const settingsApi = {
  listApiKeys: () => request<ApiKey[]>("GET", "/settings/api-keys"),
  addApiKey: (provider: string, api_key: string, model_override?: string) =>
    request<ApiKey>("POST", "/settings/api-keys", { provider, api_key, model_override }),
  testApiKey: (id: string) => request<{ status: string; error?: string }>("POST", `/settings/api-keys/${id}/test`),
  updateApiKey: (id: string, data: Partial<ApiKey>) => request<ApiKey>("PATCH", `/settings/api-keys/${id}`, data),
  deleteApiKey: (id: string) => request<void>("DELETE", `/settings/api-keys/${id}`),
};

// ─── Analytics ────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => request<AnalyticsDashboard>("GET", "/analytics/dashboard"),
  auditLog: (limit?: number) => request<AuditLog[]>("GET", `/analytics/audit-log${limit ? `?limit=${limit}` : ""}`),
  versionHistory: (entityType: string, entityId: string) =>
    request<VersionHistoryEntry[]>("GET", `/analytics/version-history/${entityType}/${entityId}`),
};

// ─── Types ────────────────────────────────────────────────
export interface MasterResume {
  id: string; user_id: string; name: string; file_url?: string; file_type?: string;
  raw_content?: string; parsed_content?: ParsedResume; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface ParsedResume {
  contact: { name: string; email: string; phone: string; location: string; linkedin: string; github: string; website: string };
  summary: string;
  experience: Array<{ company: string; title: string; location: string; start_date: string; end_date: string; current: boolean; bullets: string[] }>;
  education: Array<{ institution: string; degree: string; field: string; graduation_date: string; gpa: string; honors: string }>;
  skills: { technical: string[]; tools: string[]; languages: string[]; soft: string[] };
  certifications: Array<{ name: string; issuer: string; date: string; expiry: string }>;
  projects: Array<{ name: string; description: string; technologies: string[]; url: string; bullets: string[] }>;
  achievements: string[];
}

export interface JobApplication {
  id: string; user_id: string; company_name: string; job_title: string; job_url?: string;
  job_description: string; job_description_parsed?: Record<string, unknown>; master_resume_id?: string;
  status: ApplicationStatus; recruiter_name?: string; recruiter_linkedin?: string;
  hiring_manager_name?: string; location?: string; compensation_range?: string;
  application_deadline?: string; notes?: string;
  ats_score?: number; skill_match_score?: number; experience_match_score?: number; overall_match_score?: number;
  created_at: string; updated_at: string;
  master_resumes?: { id: string; name: string; parsed_content?: ParsedResume };
}

export type ApplicationStatus = "draft"|"ready"|"applied"|"screening"|"interview_scheduled"|"interview_r1"|"interview_r2"|"offer"|"rejected"|"withdrawn";

export interface ApplicationFull extends JobApplication {
  tailored_resumes: TailoredResume[];
  cover_letters: CoverLetter[];
  ats_analysis: ATSAnalysis | null;
  interview_kit: InterviewKit | null;
  learning_roadmap: LearningRoadmap | null;
}

export interface TailoredResume {
  id: string; user_id: string; application_id: string; version_type: string;
  content: ParsedResume; content_md: string; version_number: number; is_current: boolean;
  created_at: string; updated_at: string;
}

export interface CoverLetter {
  id: string; user_id: string; application_id: string; content: string;
  version_number: number; is_current: boolean; created_at: string; updated_at: string;
}

export interface ATSAnalysis {
  id: string; application_id: string; ats_score: number; skill_match_score: number;
  experience_match_score: number; overall_match_score: number;
  matched_keywords: string[]; missing_keywords: string[]; recommendations: string[];
  full_analysis: Record<string, unknown>; created_at: string;
}

export interface InterviewKit {
  id: string; application_id: string;
  recruiter_questions: Question[]; hiring_manager_questions: Question[];
  technical_questions: TechnicalQuestion[]; behavioral_questions: Question[];
  case_questions: Question[]; star_stories: STARStory[];
  company_research_questions?: string[]; created_at: string;
}

export interface Question { question: string; guidance: string; key_points?: string[] }
export interface TechnicalQuestion extends Question { topic_area: string; ideal_answer_framework: string }
export interface STARStory { situation: string; task: string; action: string; result: string; applicable_questions: string[]; resume_source: string }

export interface LearningRoadmap {
  id: string; application_id: string; skill_gaps: SkillGapAnalysis; roadmap: RoadmapData; created_at: string;
}
export interface SkillGapAnalysis {
  missing_skills: Array<{ skill: string; importance: string; reason: string }>;
  missing_tools: Array<{ tool: string; importance: string; reason: string }>;
  missing_concepts: Array<{ concept: string; importance: string }>;
  gap_summary: string;
}
export interface RoadmapData {
  roadmap: Array<{ skill: string; why_it_matters: string; priority: string; estimated_effort: string; estimated_hours: number; learning_path: unknown[]; milestone: string }>;
  quick_wins: string[]; total_estimated_hours: number;
}

export interface MultiJDAnalysis {
  id: string; opportunity_ranking: unknown[]; common_skill_gaps: unknown[]; common_keywords: string[]; resume_recommendations: unknown[]; created_at: string;
}

export interface ApiKey {
  id: string; provider: string; key_hint: string; is_active: boolean;
  last_tested_at?: string; test_status?: string; model_override?: string; created_at: string;
}

export interface AnalyticsDashboard {
  total_applications: number; submitted: number; interviews: number; offers: number;
  rejections: number; interview_rate: number; offer_rate: number;
  avg_ats_score: number; avg_match_score: number; by_status: Record<string, number>;
}

export interface AuditLog { id: string; action: string; entity_type?: string; entity_id?: string; metadata?: unknown; created_at: string }
export interface VersionHistoryEntry { id: string; version_number: number; diff_summary?: string; created_at: string }
export interface CreateApplicationInput {
  company_name: string; job_title: string; job_description: string; job_url?: string;
  master_resume_id?: string; recruiter_name?: string; hiring_manager_name?: string;
  location?: string; compensation_range?: string; application_deadline?: string; notes?: string;
}
