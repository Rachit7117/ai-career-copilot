"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, aiApi, downloadExport } from "@/lib/api";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Wand2, Download, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CoverLetterPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const { data: app } = useQuery({ queryKey: ["application", id], queryFn: () => applicationsApi.getFull(id) });

  const currentCL = app?.cover_letters?.find((cl) => cl.is_current);

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentCL?.content || "",
  });

  useEffect(() => {
    if (currentCL?.content && editor) {
      editor.commands.setContent(currentCL.content);
    }
  }, [currentCL?.content, editor]);

  const generateMutation = useMutation({
    mutationFn: () => aiApi.generateCoverLetter(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["application", id] });
      editor?.commands.setContent(data.content);
      toast.success("Cover letter generated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/applications/${id}`} className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Cover Letter — {app?.company_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {currentCL ? "Regenerate" : "Generate"}
          </button>
          {currentCL && (
            <div className="flex gap-1">
              {(["pdf", "docx", "md"] as const).map((fmt) => (
                <button key={fmt} onClick={() => downloadExport("cover_letter", currentCL.id, fmt).catch(() => toast.error("Export failed"))} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />{fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
          {[
            { cmd: () => editor?.chain().focus().toggleBold().run(), label: "B", active: editor?.isActive("bold") },
            { cmd: () => editor?.chain().focus().toggleItalic().run(), label: "I", active: editor?.isActive("italic") },
            { cmd: () => editor?.chain().focus().toggleBulletList().run(), label: "•", active: editor?.isActive("bulletList") },
          ].map(({ cmd, label, active }) => (
            <button key={label} onClick={cmd} className={`px-2 py-1 rounded text-sm font-medium ${active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
          {currentCL && <span className="ml-auto text-xs text-muted-foreground">v{currentCL.version_number}</span>}
        </div>
        {currentCL ? (
          <div className="p-6 min-h-[500px]">
            <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none" />
          </div>
        ) : (
          <div className="p-12 text-center">
            <Wand2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium">No cover letter yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click Generate to create a tailored cover letter</p>
          </div>
        )}
      </div>
    </div>
  );
}
