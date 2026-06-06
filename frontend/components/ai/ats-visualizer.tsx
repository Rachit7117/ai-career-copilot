"use client";
import { scoreBarColor } from "@/lib/utils";
import type { ATSAnalysis } from "@/lib/api";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";

export function ATSVisualizer({ analysis }: { analysis: ATSAnalysis }) {
  const full = analysis.full_analysis as Record<string, unknown>;
  const sectionScores = (full?.section_scores as Record<string, number>) || {};

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="font-medium text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />ATS Analysis</h3>

      {/* Score bars */}
      <div className="space-y-2">
        {[
          { label: "ATS Score", value: analysis.ats_score },
          { label: "Skill Match", value: analysis.skill_match_score },
          { label: "Experience Match", value: analysis.experience_match_score },
          { label: "Overall Match", value: analysis.overall_match_score },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{Math.round(value)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${scoreBarColor(value)}`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Keywords */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Matched ({analysis.matched_keywords?.length ?? 0})
          </p>
          <div className="flex flex-wrap gap-1">
            {(analysis.matched_keywords || []).slice(0, 15).map((kw) => (
              <span key={kw} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">{kw}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />Missing ({analysis.missing_keywords?.length ?? 0})
          </p>
          <div className="flex flex-wrap gap-1">
            {(analysis.missing_keywords || []).slice(0, 15).map((kw) => (
              <span key={kw} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">{kw}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />Recommendations
          </p>
          <ul className="space-y-1.5">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
