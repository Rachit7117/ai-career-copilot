"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, aiApi, type ApplicationStatus } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreCircle } from "@/components/ui/score-circle";
import { ATSVisualizer } from "@/components/ai/ats-visualizer";
import { formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Wand2, FileText, MessageSquare, Mic, Map, ExternalLink, ChevronRight, BarChart3 } from "lucide-react";

const STATUS_ORDER: ApplicationStatus[] = ["draft","ready","applied","screening","interview_scheduled","interview_r1","interview_r2","offer","rejected","withdrawn"];

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({ queryKey: ["application", id], queryFn: () => applicationsApi.getFull(id) });

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) => applicationsApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Status updated"); },
  });
  const generateResumeMutation = useMutation({
    mutationFn: (type: "ats" | "recruiter" | "impact") => aiApi.generateResume(id, type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Resume generated!"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const generateCLMutation = useMutation({
    mutationFn: () => aiApi.generateCoverLetter(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Cover letter generated!"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const generateKitMutation = useMutation({
    mutationFn: () => aiApi.interviewKit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Interview kit ready!"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const generateRoadmapMutation = useMutation({
    mutationFn: () => aiApi.learningRoadmap(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Learning roadmap ready!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!app) return <div className="p-8 text-center text-muted-foreground">Application not found.</div>;

  const ats = app.ats_analysis;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/applications" className="hover:text-foreground">Applications</Link>
            <ChevronRight className="w-3 h-3" />
            <span>{app.company_name}</span>
          </div>
          <h1 className="text-2xl font-semibold">{app.job_title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-muted-foreground">{app.company_name}</span>
            {app.location && <span className="text-muted-foreground text-sm">• {app.location}</span>}
            {app.job_url && (
              <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />View JD
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={app.status}
            onChange={(e) => statusMutation.mutate(e.target.value as ApplicationStatus)}
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Score cards */}
      {(app.ats_score || app.overall_match_score) && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "ATS Score", value: app.ats_score },
            { label: "Skill Match", value: app.skill_match_score },
            { label: "Exp Match", value: app.experience_match_score },
            { label: "Overall", value: app.overall_match_score },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
              <ScoreCircle score={value ?? undefined} size="lg" />
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left col — actions */}
        <div className="col-span-1 space-y-4">
          {/* Generate Resume */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" />Generate Resume</h3>
            <div className="space-y-2">
              {(["ats", "recruiter", "impact"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => generateResumeMutation.mutate(type)}
                  disabled={generateResumeMutation.isPending}
                  className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <span className="capitalize">{type === "ats" ? "ATS Optimized" : type === "recruiter" ? "Recruiter Friendly" : "Impact Focused"}</span>
                  {generateResumeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </button>
              ))}
              {app.tailored_resumes?.length > 0 && (
                <Link href={`/applications/${id}/resume-studio`} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
                  <FileText className="w-3 h-3" />Open Resume Studio →
                </Link>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />Cover Letter</h3>
            <button
              onClick={() => generateCLMutation.mutate()}
              disabled={generateCLMutation.isPending}
              className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <span>{app.cover_letters?.length ? "Regenerate" : "Generate"} Cover Letter</span>
              {generateCLMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-muted-foreground" />}
            </button>
            {app.cover_letters?.length > 0 && (
              <Link href={`/applications/${id}/cover-letter`} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
                <MessageSquare className="w-3 h-3" />Edit Cover Letter →
              </Link>
            )}
          </div>

          {/* Interview Kit */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Mic className="w-4 h-4 text-primary" />Interview Prep</h3>
            <button
              onClick={() => generateKitMutation.mutate()}
              disabled={generateKitMutation.isPending}
              className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <span>{app.interview_kit ? "Regenerate Kit" : "Generate Interview Kit"}</span>
              {generateKitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-muted-foreground" />}
            </button>
            {app.interview_kit && (
              <Link href={`/applications/${id}/interview-prep`} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
                <Mic className="w-3 h-3" />View Interview Kit →
              </Link>
            )}
          </div>

          {/* Learning Roadmap */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Map className="w-4 h-4 text-primary" />Learning Roadmap</h3>
            <button
              onClick={() => generateRoadmapMutation.mutate()}
              disabled={generateRoadmapMutation.isPending}
              className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <span>{app.learning_roadmap ? "Regenerate" : "Generate"} Roadmap</span>
              {generateRoadmapMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-muted-foreground" />}
            </button>
            {app.learning_roadmap && (
              <Link href={`/applications/${id}/learning-roadmap`} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
                <Map className="w-3 h-3" />View Roadmap →
              </Link>
            )}
          </div>
        </div>

        {/* Right col — ATS + JD */}
        <div className="col-span-2 space-y-4">
          {ats && <ATSVisualizer analysis={ats} />}

          {/* Job Description */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3">Job Description</h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
              {app.job_description}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3">Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: "Master Resume", value: app.master_resumes?.name },
                { label: "Status", value: STATUS_LABELS[app.status] },
                { label: "Recruiter", value: app.recruiter_name },
                { label: "Hiring Manager", value: app.hiring_manager_name },
                { label: "Location", value: app.location },
                { label: "Compensation", value: app.compensation_range },
                { label: "Deadline", value: app.application_deadline ? formatDate(app.application_deadline) : undefined },
                { label: "Created", value: formatDate(app.created_at) },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            {app.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <dt className="text-xs text-muted-foreground mb-1">Notes</dt>
                <dd className="text-sm">{app.notes}</dd>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
