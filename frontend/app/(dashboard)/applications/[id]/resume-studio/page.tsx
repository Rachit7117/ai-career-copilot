"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, aiApi, downloadExport, analyticsApi, type TailoredResume } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Download, History, ArrowLeft, Wand2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ResumeDiffViewer } from "@/components/ai/resume-diff-viewer";
import { ResumeEditor } from "@/components/ai/resume-editor";
import { formatRelative } from "@/lib/utils";

export default function ResumeStudioPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const { data: app } = useQuery({ queryKey: ["application", id], queryFn: () => applicationsApi.getFull(id) });
  const { data: history } = useQuery({ queryKey: ["version-history", id], queryFn: () => analyticsApi.versionHistory("tailored_resume", id) });
  const [activeVersion, setActiveVersion] = useState<"ats" | "recruiter" | "impact">("ats");
  const [showDiff, setShowDiff] = useState(false);

  const generateMutation = useMutation({
    mutationFn: (type: "ats" | "recruiter" | "impact") => aiApi.generateResume(id, type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["application", id] }); toast.success("New version generated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!app) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const currentResume = app.tailored_resumes?.find((r) => r.version_type === activeVersion && r.is_current);
  const allVersions = app.tailored_resumes?.filter((r) => r.version_type === activeVersion) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/applications/${id}`} className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Resume Studio — {app.company_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDiff(!showDiff)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${showDiff ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            <History className="w-4 h-4 inline mr-1.5" />{showDiff ? "Hide" : "Show"} Diff
          </button>
          {currentResume && (
            <div className="flex gap-1">
              {(["pdf", "docx", "md"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => downloadExport("tailored_resume", currentResume.id, fmt).catch(() => toast.error("Export failed"))}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />{fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Version tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["ats", "recruiter", "impact"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveVersion(type)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeVersion === type ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {type === "ats" ? "ATS Optimized" : type === "recruiter" ? "Recruiter" : "Impact"}
            {app.tailored_resumes?.find((r) => r.version_type === type) && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            )}
          </button>
        ))}
        <button
          onClick={() => generateMutation.mutate(activeVersion)}
          disabled={generateMutation.isPending}
          className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Regenerate
        </button>
      </div>

      {currentResume ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: showDiff && allVersions.length > 1 ? "1fr 1fr" : "1fr" }}>
          <ResumeEditor resume={currentResume} applicationId={id} />
          {showDiff && allVersions.length <= 1 && (
            <div className="bg-card border border-border rounded-xl p-8 text-center flex flex-col items-center justify-center">
              <p className="font-medium text-sm">No previous version to compare</p>
              <p className="text-xs text-muted-foreground mt-1">Click <strong>Regenerate</strong> to create a second version, then Show Diff will display the changes.</p>
            </div>
          )}
          {showDiff && allVersions.length > 1 && (
            <ResumeDiffViewer current={currentResume} previous={allVersions[1]} />
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Wand2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No {activeVersion} resume generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click Regenerate to create this version</p>
        </div>
      )}
    </div>
  );
}
