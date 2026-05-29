"use client";

import type { PriorityAction } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import type { WorkspaceCopy } from "@/components/site/site-workspace";

// Standardized calm surfaces — match the landing-page aesthetic:
// subtle border, solid card bg, soft shadow, restrained radii and padding.
export const SURFACE = "rounded-2xl border border-border/70 bg-card p-4 shadow-sm";
export const SURFACE_SUBTLE = "rounded-2xl border border-border/70 bg-muted/40 p-4";
export const STAT = "rounded-xl bg-background p-3";
export const DASHED = "rounded-2xl border border-dashed border-border bg-muted/30 p-4";

export function ScoreStat({
  label,
  value,
  note,
  icon: Icon,
  tone,
  bar,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
  bar?: number;
}) {
  return (
    <div className={STAT}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
      {note ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p> : null}
      {bar !== undefined ? <Progress value={bar} className="mt-2" /> : null}
    </div>
  );
}

function priorityVariant(priority: PriorityAction["priority"]) {
  return priority === "high" ? "default" : priority === "medium" ? "secondary" : "outline";
}

export function FixCard({
  action,
  copy,
  density = "full",
}: {
  action: PriorityAction;
  copy: WorkspaceCopy;
  density?: "full" | "compact";
}) {
  const metricChip = action.metric ? (
    <span className="ms-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {action.metric}
    </span>
  ) : null;

  if (density === "compact") {
    return (
      <div className={SURFACE}>
        <div className="mb-1.5 flex items-center gap-2">
          <Badge variant={priorityVariant(action.priority)}>{copy.priorityLabels[action.priority]}</Badge>
          {metricChip}
        </div>
        <h3 className="text-sm font-semibold leading-snug">{action.title}</h3>
        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{action.howToFix}</p>
      </div>
    );
  }

  return (
    <div className={SURFACE}>
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={priorityVariant(action.priority)}>{copy.priorityLabels[action.priority]}</Badge>
        {metricChip}
      </div>
      <h3 className="text-sm font-semibold leading-snug">{action.title}</h3>
      <p className="mt-2 text-sm leading-6 text-foreground/80">{action.howToFix}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{action.whyItMatters}</p>
    </div>
  );
}

// Single forward-looking placeholder used everywhere a roadmap capability needs a
// "coming soon" surface (replaces the scattered teaser/sidebar cards).
export function RoadmapPlaceholder({
  icon: Icon,
  title,
  description,
  points,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  points?: string[];
  badge: string;
}) {
  return (
    <div className={DASHED}>
      <div className="mb-2 flex items-center gap-2.5">
        <div className="rounded-xl bg-muted p-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline" className="ms-auto">{badge}</Badge>
      </div>
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
      {points && points.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
