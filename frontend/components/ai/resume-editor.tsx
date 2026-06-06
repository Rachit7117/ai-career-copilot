"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useMutation } from "@tanstack/react-query";
import { aiApi, type TailoredResume } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { useState } from "react";

const REWRITE_ACTIONS = [
  { key: "rewrite", label: "Rewrite" },
  { key: "expand", label: "Expand" },
  { key: "shorten", label: "Shorten" },
  { key: "ats_optimize", label: "ATS Optimize" },
  { key: "improve_impact", label: "Improve Impact" },
] as const;

export function ResumeEditor({ resume, applicationId }: { resume: TailoredResume; applicationId: string }) {
  const [selectedText, setSelectedText] = useState("");
  const [showActions, setShowActions] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Resume content..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: resume.content_md || "",
    onSelectionUpdate({ editor }) {
      const sel = editor.state.selection;
      const text = editor.state.doc.textBetween(sel.from, sel.to);
      setSelectedText(text);
      setShowActions(text.length > 10);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (instruction: string) => aiApi.rewrite(applicationId, selectedText, instruction),
    onSuccess: (data) => {
      if (editor && data.result) {
        editor.commands.insertContent(data.result);
        setShowActions(false);
        toast.success("Applied!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
        {[
          { cmd: () => editor?.chain().focus().toggleBold().run(), label: "B", active: editor?.isActive("bold"), title: "Bold" },
          { cmd: () => editor?.chain().focus().toggleItalic().run(), label: "I", active: editor?.isActive("italic"), title: "Italic" },
          { cmd: () => editor?.chain().focus().toggleUnderline().run(), label: "U", active: editor?.isActive("underline"), title: "Underline" },
          { cmd: () => editor?.chain().focus().toggleBulletList().run(), label: "•", active: editor?.isActive("bulletList"), title: "Bullet List" },
          { cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), label: "H2", active: editor?.isActive("heading", { level: 2 }), title: "Heading 2" },
        ].map(({ cmd, label, active, title }) => (
          <button
            key={label}
            onClick={cmd}
            title={title}
            className={`px-2 py-1 rounded text-sm font-medium transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {showActions && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1"><Wand2 className="w-3 h-3" />AI:</span>
            {REWRITE_ACTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => rewriteMutation.mutate(key)}
                disabled={rewriteMutation.isPending}
                className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {rewriteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="p-4 min-h-[500px]">
        <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none" />
      </div>
    </div>
  );
}
