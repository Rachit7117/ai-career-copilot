"use client";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, type JobApplication, type ApplicationStatus } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreCircle } from "@/components/ui/score-circle";
import { formatRelative, STATUS_LABELS } from "@/lib/utils";
import { ExternalLink, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_ORDER: ApplicationStatus[] = ["draft","ready","applied","screening","interview_scheduled","interview_r1","interview_r2","offer","rejected","withdrawn"];

export function ApplicationsTable({ applications }: { applications: JobApplication[] }) {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); toast.success("Application deleted"); },
    onError: () => toast.error("Failed to delete"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => applicationsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["Company", "Role", "Status", "ATS", "Match", "Updated", ""].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-muted/30 transition-colors group">
              <td className="py-3 px-4">
                <div className="font-medium">{app.company_name}</div>
                {app.location && <div className="text-xs text-muted-foreground">{app.location}</div>}
              </td>
              <td className="py-3 px-4">
                <div>{app.job_title}</div>
                {app.job_url && (
                  <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-0.5">
                    <ExternalLink className="w-3 h-3" />JD
                  </a>
                )}
              </td>
              <td className="py-3 px-4">
                <select
                  value={app.status}
                  onChange={(e) => statusMutation.mutate({ id: app.id, status: e.target.value as ApplicationStatus })}
                  className="bg-transparent text-xs border-none outline-none cursor-pointer"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <StatusBadge status={app.status} />
              </td>
              <td className="py-3 px-4"><ScoreCircle score={app.ats_score ?? undefined} size="sm" /></td>
              <td className="py-3 px-4"><ScoreCircle score={app.overall_match_score ?? undefined} size="sm" /></td>
              <td className="py-3 px-4 text-muted-foreground">{formatRelative(app.updated_at)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/applications/${app.id}`} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => { if (confirm("Delete this application?")) deleteMutation.mutate(app.id); }}
                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
