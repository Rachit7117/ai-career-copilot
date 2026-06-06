import { cn, scoreColor } from "@/lib/utils";

interface Props { score: number | undefined; size?: "sm" | "md" | "lg"; label?: string }

export function ScoreCircle({ score, size = "md", label }: Props) {
  if (score === undefined || score === null) return <span className="text-muted-foreground text-sm">—</span>;

  const sizes = { sm: "text-xs", md: "text-sm font-semibold", lg: "text-2xl font-bold" };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn(sizes[size], scoreColor(score))}>{Math.round(score)}%</span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
