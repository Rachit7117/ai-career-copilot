"use client";
import type { TailoredResume } from "@/lib/api";
import { formatRelative } from "@/lib/utils";

export function ResumeDiffViewer({ current, previous }: { current: TailoredResume; previous: TailoredResume }) {
  const currentLines = (current.content_md || "").split("\n");
  const previousLines = (previous.content_md || "").split("\n");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex border-b border-border">
        <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/10 border-r border-border">
          <p className="text-xs font-medium text-muted-foreground">Previous — v{previous.version_number} <span className="text-muted-foreground/70">({formatRelative(previous.created_at)})</span></p>
        </div>
        <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/10">
          <p className="text-xs font-medium text-muted-foreground">Current — v{current.version_number} <span className="text-muted-foreground/70">({formatRelative(current.created_at)})</span></p>
        </div>
      </div>
      <div className="flex font-mono text-xs overflow-auto max-h-[600px]">
        <div className="flex-1 p-3 border-r border-border space-y-0.5">
          {previousLines.map((line, i) => (
            <div key={i} className={`px-1 rounded ${!currentLines.includes(line) && line ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200" : ""}`}>
              {line || " "}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 space-y-0.5">
          {currentLines.map((line, i) => (
            <div key={i} className={`px-1 rounded ${!previousLines.includes(line) && line ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" : ""}`}>
              {line || " "}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
