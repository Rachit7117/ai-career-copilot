"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Briefcase, PlusCircle,
  Settings, BookOpen, ChevronRight, Zap,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resumes", label: "Resume Library", icon: FileText },
  { href: "/applications/new", label: "New Application", icon: PlusCircle },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-card">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Career Copilot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/applications"
            ? pathname.startsWith("/applications") && pathname !== "/applications/new"
            : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href} href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-40" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="w-3 h-3" />
            <span>AI-powered career tools</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
