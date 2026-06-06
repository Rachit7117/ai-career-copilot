"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { resumesApi, applicationsApi, type CreateApplicationInput } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Briefcase, Link2, FileText, User, MapPin, DollarSign, Calendar, StickyNote } from "lucide-react";

export default function NewApplicationPage() {
  const router = useRouter();
  const { data: resumes = [] } = useQuery({ queryKey: ["resumes"], queryFn: resumesApi.list });
  const [form, setForm] = useState<CreateApplicationInput>({
    company_name: "", job_title: "", job_description: "", job_url: "",
    master_resume_id: "", recruiter_name: "", hiring_manager_name: "",
    location: "", compensation_range: "", application_deadline: "", notes: "",
  });
  const [showOptional, setShowOptional] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateApplicationInput) => applicationsApi.create(data),
    onSuccess: (app) => {
      toast.success("Application created!");
      router.push(`/applications/${app.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function set(key: keyof CreateApplicationInput, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form };
    // Clean empty strings
    Object.keys(data).forEach((k) => { if (data[k as keyof CreateApplicationInput] === "") delete (data as Record<string, unknown>)[k]; });
    createMutation.mutate(data);
  }

  const inputClass = "w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Application</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add a job you want to apply for</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-medium text-sm">Job Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-muted-foreground" />Company</label>
              <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Acme Corp" required className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Job Title</label>
              <input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Product Manager" required className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-muted-foreground" />Job URL</label>
            <input value={form.job_url} onChange={(e) => set("job_url", e.target.value)} placeholder="https://..." type="url" className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" />Job Description <span className="text-muted-foreground font-normal">(paste full text)</span></label>
            <textarea
              value={form.job_description}
              onChange={(e) => set("job_description", e.target.value)}
              placeholder="Paste the complete job description here..."
              required rows={8}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Master Resume</label>
            <select value={form.master_resume_id} onChange={(e) => set("master_resume_id", e.target.value)} className={inputClass}>
              <option value="">Select a resume...</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} {r.is_active ? "(Active)" : ""}</option>
              ))}
            </select>
            {resumes.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">No resumes yet. <a href="/resumes" className="underline">Upload one first.</a></p>
            )}
          </div>
        </div>

        {/* Optional */}
        <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
          {showOptional ? "Hide" : "Show"} optional fields
        </button>

        {showOptional && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-medium text-sm">Additional Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground" />Recruiter Name</label>
                <input value={form.recruiter_name} onChange={(e) => set("recruiter_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Hiring Manager</label>
                <input value={form.hiring_manager_name} onChange={(e) => set("hiring_manager_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />Location</label>
                <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="San Francisco, CA / Remote" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" />Compensation</label>
                <input value={form.compensation_range} onChange={(e) => set("compensation_range", e.target.value)} placeholder="$120k – $150k" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />Deadline</label>
                <input type="date" value={form.application_deadline} onChange={(e) => set("application_deadline", e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5 text-muted-foreground" />Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createMutation.isPending ? "Creating..." : "Create Application"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
