"use client";
import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api";
import { ApplicationsTable } from "@/components/applications/applications-table";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { useState } from "react";
import { PlusCircle, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { aiApi, resumesApi, type MultiJDRequest } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Loader2 } from "lucide-react";

export default function ApplicationsPage() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMultiJD, setShowMultiJD] = useState(false);
  const { data: applications = [], isLoading } = useQuery({ queryKey: ["applications", statusFilter], queryFn: () => applicationsApi.list(statusFilter || undefined) });
  const { data: resumes = [] } = useQuery({ queryKey: ["resumes"], queryFn: resumesApi.list });
  const [multiJDResumeId, setMultiJDResumeId] = useState("");

  const multiJDMutation = useMutation({
    mutationFn: () => aiApi.multiJD(selectedIds, multiJDResumeId),
    onSuccess: () => { toast.success("Multi-JD analysis complete!"); setShowMultiJD(false); setSelectedIds([]); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{applications.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length >= 2 && (
            <button
              onClick={() => setShowMultiJD(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
            >
              <Layers className="w-4 h-4" />Multi-JD Analysis ({selectedIds.length})
            </button>
          )}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background">
            <option value="">All statuses</option>
            {["draft","ready","applied","screening","interview_scheduled","offer","rejected"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button onClick={() => setView("table")} className={`p-1.5 rounded-md ${view === "table" ? "bg-background shadow-sm" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setView("kanban")} className={`p-1.5 rounded-md ${view === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <Link href="/applications/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            <PlusCircle className="w-4 h-4" />New
          </Link>
        </div>
      </div>

      {/* Multi-JD modal */}
      {showMultiJD && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold">Multi-JD Analysis</h2>
            <p className="text-sm text-muted-foreground">Analyzing {selectedIds.length} applications. Select the master resume to compare against.</p>
            <select value={multiJDResumeId} onChange={(e) => setMultiJDResumeId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background">
              <option value="">Select master resume...</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => multiJDMutation.mutate()}
                disabled={!multiJDResumeId || multiJDMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {multiJDMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Analyze
              </button>
              <button onClick={() => setShowMultiJD(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No applications found</p>
            <Link href="/applications/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90">
              <PlusCircle className="w-4 h-4" />New Application
            </Link>
          </div>
        ) : view === "table" ? (
          <ApplicationsTable applications={applications} />
        ) : (
          <KanbanBoard applications={applications} />
        )}
      </div>
    </div>
  );
}
