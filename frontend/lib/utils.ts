import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApplicationStatus } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  ready: "Ready to Apply",
  applied: "Applied",
  screening: "Recruiter Screening",
  interview_scheduled: "Interview Scheduled",
  interview_r1: "Interview Round 1",
  interview_r2: "Interview Round 2",
  offer: "Offer Received",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ready: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  applied: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  screening: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  interview_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  interview_r1: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  interview_r2: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  offer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export const KANBAN_COLUMNS: ApplicationStatus[] = [
  "draft", "ready", "applied", "screening",
  "interview_scheduled", "interview_r1", "interview_r2",
  "offer", "rejected",
];

export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}
