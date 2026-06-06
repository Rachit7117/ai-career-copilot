"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, aiApi, downloadExport } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Wand2, Loader2, ChevronRight, Clock, Target, BookOpen, Youtube, FileText, Link } from "lucide-react";
import NextLink from "next/link";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  youtube: Youtube,
  documentation: FileText,
  course: BookOpen,
  article: FileText,
  book: BookOpen,
};

export default function LearningRoadmapPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const { data: app } = useQuery({ queryKey: ["application", id], queryFn: () => applicationsApi.getFull(id) });

  const roadmapData = app?.learning_roadmap?.roadmap as { roadmap: unknown[]; quick_wins: string[]; total_estimated_hours: number } | undefined;
  const items = (roadmapData?.roadmap || []) as Array<{
    skill: string; why_it_matters: string; priority: string;
    estimated_effort: string; estimated_hours: number; milestone: string;
    how_to_demonstrate: string;
    learning_path: Array<{ step: number; title: string; resources: Array<{ type: string; title: string; url: string; description: string; free: boolean; estimated_time: string }> }>;
  }>;

  const generateMutation = useMutation({
    mutationFn: () => aiApi.learningRoadmap(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("Roadmap generated!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <NextLink href={`/applications/${id}`} className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Back</NextLink>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Learning Roadmap — {app?.company_name}</span>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {app?.learning_roadmap ? "Regenerate" : "Generate"} Roadmap
        </button>
      </div>

      {!app?.learning_roadmap ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No learning roadmap yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate a roadmap to close skill gaps for this role</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {roadmapData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Skills to Learn</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{roadmapData.total_estimated_hours}h</p>
                <p className="text-sm text-muted-foreground">Est. Total Time</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{roadmapData.quick_wins?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Quick Wins</p>
              </div>
            </div>
          )}

          {/* Quick wins */}
          {roadmapData?.quick_wins && roadmapData.quick_wins.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2">⚡ Quick Wins — Add to Resume Now</h3>
              <ul className="space-y-1">
                {roadmapData.quick_wins.map((win, i) => (
                  <li key={i} className="text-sm flex gap-2 text-green-800 dark:text-green-200"><span>•</span>{win}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skill cards */}
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{item.skill}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.why_it_matters}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.estimated_effort}</span>
                      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{item.estimated_hours}h</span>
                    </div>
                  </div>

                  {item.milestone && (
                    <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground mb-3">
                      <span className="font-medium">Milestone:</span> {item.milestone}
                    </div>
                  )}

                  {/* Learning path */}
                  {item.learning_path?.map((step) => (
                    <div key={step.step} className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Step {step.step}: {step.title}</p>
                      <div className="space-y-2">
                        {step.resources?.map((res, j) => {
                          const Icon = RESOURCE_ICONS[res.type] || BookOpen;
                          return (
                            <div key={j} className="flex items-start gap-3 p-2.5 border border-border rounded-lg bg-muted/20">
                              <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{res.title}</span>
                                  {res.free && <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">Free</span>}
                                  {res.estimated_time && <span className="text-xs text-muted-foreground">{res.estimated_time}</span>}
                                </div>
                                {res.description && <p className="text-xs text-muted-foreground mt-0.5">{res.description}</p>}
                                {res.url && (
                                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                    <Link className="w-3 h-3" />Open resource
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
