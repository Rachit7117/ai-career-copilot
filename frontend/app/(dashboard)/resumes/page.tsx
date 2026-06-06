"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resumesApi, type MasterResume } from "@/lib/api";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileText, Star, StarOff, Trash2, RefreshCw, Loader2, PlusCircle } from "lucide-react";
import { formatRelative } from "@/lib/utils";

export default function ResumesPage() {
  const qc = useQueryClient();
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ["resumes"], queryFn: resumesApi.list });
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useMutation({
    mutationFn: resumesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); toast.success("Resume deleted"); },
  });
  const activeMutation = useMutation({
    mutationFn: resumesApi.setActive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); toast.success("Active resume updated"); },
  });
  const reparseMutation = useMutation({
    mutationFn: resumesApi.reparse,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); toast.success("Resume reparsed"); },
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadName) return;
    setUploading(true);
    try {
      await resumesApi.upload(uploadName, file);
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume uploaded and parsed!");
      setShowForm(false);
      setUploadName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resume Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your master resumes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Upload Resume
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-medium mb-4">Upload New Resume</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Resume Name</label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Product Manager Resume"
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">File <span className="text-muted-foreground font-normal">(PDF, DOCX, TXT, MD)</span></label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                required
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-md file:bg-muted file:text-foreground file:text-sm cursor-pointer"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit" disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading & Parsing..." : "Upload"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resume list */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading resumes...</div>
      ) : resumes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No resumes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload a resume to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onSetActive={() => activeMutation.mutate(resume.id)}
              onReparse={() => reparseMutation.mutate(resume.id)}
              onDelete={() => { if (confirm("Delete this resume?")) deleteMutation.mutate(resume.id); }}
              reparsingId={reparseMutation.isPending ? resume.id : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({ resume, onSetActive, onReparse, onDelete, reparsingId }: {
  resume: MasterResume; onSetActive: () => void; onReparse: () => void;
  onDelete: () => void; reparsingId: string | null;
}) {
  const pc = resume.parsed_content;
  return (
    <div className={`bg-card border rounded-xl p-4 flex items-start gap-4 transition-colors ${resume.is_active ? "border-primary/50 bg-primary/5" : "border-border"}`}>
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{resume.name}</span>
          {resume.is_active && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
              <Star className="w-3 h-3" />Active
            </span>
          )}
          <span className="text-xs text-muted-foreground uppercase">{resume.file_type}</span>
        </div>
        {pc?.contact?.name && <p className="text-sm text-muted-foreground mt-0.5">{pc.contact.name} • {pc.experience?.length ?? 0} positions • {Object.values(pc.skills || {}).flat().length} skills</p>}
        <p className="text-xs text-muted-foreground mt-1">Uploaded {formatRelative(resume.created_at)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!resume.is_active && (
          <button onClick={onSetActive} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-amber-500" title="Set as active">
            <StarOff className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onReparse}
          disabled={reparsingId === resume.id}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Re-parse"
        >
          {reparsingId === resume.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
