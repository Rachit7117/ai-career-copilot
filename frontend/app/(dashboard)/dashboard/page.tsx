"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, applicationsApi } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreCircle } from "@/components/ui/score-circle";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { ApplicationsTable } from "@/components/applications/applications-table";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle, TrendingUp, Send, PhoneCall, Gift, XCircle, LayoutGrid, List } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const { data: analytics } = useQuery({ queryKey: ["analytics"], queryFn: analyticsApi.dashboard });
  const { data: applications = [], isLoading } = useQuery({ queryKey: ["applications"], queryFn: () => applicationsApi.list() });

  const stats = [
    { label: "Total", value: analytics?.total_applications ?? 0, icon: Send, color: "text-blue-500" },
    { label: "Interviews", value: analytics?.interviews ?? 0, icon: PhoneCall, color: "text-amber-500" },
    { label: "Offers", value: analytics?.offers ?? 0, icon: Gift, color: "text-green-500" },
    { label: "Rejections", value: analytics?.rejections ?? 0, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your job search progress</p>
        </div>
        <Link
          href="/applications/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Rate cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 col-span-1">
            <p className="text-xs text-muted-foreground mb-1">Interview Rate</p>
            <p className="text-lg font-semibold">{analytics.interview_rate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Offer Rate</p>
            <p className="text-lg font-semibold">{analytics.offer_rate}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg ATS Score</p>
            <p className="text-lg font-semibold">{analytics.avg_ats_score || "—"}{analytics.avg_ats_score ? "%" : ""}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Match Score</p>
            <p className="text-lg font-semibold">{analytics.avg_match_score || "—"}{analytics.avg_match_score ? "%" : ""}</p>
          </div>
        </div>
      )}

      {/* Applications */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-medium text-sm">Applications</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium">No applications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first application to get started</p>
            <Link href="/applications/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors">
              <PlusCircle className="w-4 h-4" />
              New Application
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

function Briefcase({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
