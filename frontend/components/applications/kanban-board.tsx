"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type JobApplication, type ApplicationStatus } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreCircle } from "@/components/ui/score-circle";
import { KANBAN_COLUMNS, STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Building2 } from "lucide-react";

export function KanbanBoard({ applications }: { applications: JobApplication[] }) {
  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => applicationsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const byStatus = KANBAN_COLUMNS.reduce<Record<string, JobApplication[]>>((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s);
    return acc;
  }, {});

  return (
    <div className="flex gap-3 p-4 overflow-x-auto min-h-[400px]">
      {KANBAN_COLUMNS.map((status) => (
        <div key={status} className="shrink-0 w-56">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{STATUS_LABELS[status]}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">{byStatus[status].length}</span>
          </div>
          <div className="space-y-2">
            {byStatus[status].map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="block p-3 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{app.company_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.job_title}</div>
                  </div>
                </div>
                {(app.ats_score || app.overall_match_score) && (
                  <div className="flex gap-3 mt-2">
                    {app.ats_score && <ScoreCircle score={app.ats_score} size="sm" label="ATS" />}
                    {app.overall_match_score && <ScoreCircle score={app.overall_match_score} size="sm" label="Match" />}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
