"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, aiApi } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Wand2, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Question, TechnicalQuestion, STARStory } from "@/lib/api";

const TABS = ["Recruiter", "Hiring Manager", "Technical", "Behavioral", "Case", "STAR Stories"] as const;
type Tab = (typeof TABS)[number];

export default function InterviewPrepPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const { data: app } = useQuery({ queryKey: ["application", id], queryFn: () => applicationsApi.getFull(id) });
  const [activeTab, setActiveTab] = useState<Tab>("Recruiter");
  const [expanded, setExpanded] = useState<number | null>(null);

  const kit = app?.interview_kit;

  const generateMutation = useMutation({
    mutationFn: () => aiApi.interviewKit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Interview kit generated!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabData: Record<Tab, Question[] | TechnicalQuestion[] | STARStory[]> = {
    "Recruiter": kit?.recruiter_questions || [],
    "Hiring Manager": kit?.hiring_manager_questions || [],
    "Technical": kit?.technical_questions || [],
    "Behavioral": kit?.behavioral_questions || [],
    "Case": kit?.case_questions || [],
    "STAR Stories": kit?.star_stories || [],
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/applications/${id}`} className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Interview Prep — {app?.company_name}</span>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {kit ? "Regenerate Kit" : "Generate Kit"}
        </button>
      </div>

      {!kit ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Wand2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No interview kit yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate an interview kit based on your resume and the job description</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            {TABS.map((tab) => {
              const count = (tabData[tab] as unknown[]).length;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setExpanded(null); }}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab} <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 space-y-3">
            {activeTab === "STAR Stories" ? (
              (tabData["STAR Stories"] as STARStory[]).map((story, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">{story.applicable_questions?.[0] || `STAR Story ${i + 1}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Source: {story.resume_source}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === i ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === i && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border">
                      {[
                        { label: "Situation", value: story.situation, color: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" },
                        { label: "Task", value: story.task, color: "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800" },
                        { label: "Action", value: story.action, color: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" },
                        { label: "Result", value: story.result, color: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`p-3 rounded-lg border ${color}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              (tabData[activeTab] as Question[]).map((q, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <p className="font-medium text-sm pr-4">{q.question}</p>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded === i ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === i && (
                    <div className="px-4 pb-4 border-t border-border space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Guidance</p>
                        <p className="text-sm">{q.guidance}</p>
                      </div>
                      {q.key_points && q.key_points.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Points</p>
                          <ul className="space-y-1">
                            {q.key_points.map((kp, j) => (
                              <li key={j} className="text-sm flex gap-2"><span className="text-primary">•</span>{kp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {"ideal_answer_framework" in q && (q as TechnicalQuestion).ideal_answer_framework && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Answer Framework</p>
                          <p className="text-sm">{(q as TechnicalQuestion).ideal_answer_framework}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
