"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LearningEntry, Employee } from "@/lib/contentstack/types";

const typeColors: Record<string, "default" | "success" | "warning" | "info" | "danger"> = {
  course: "success",
  article: "info",
  video: "warning",
  project: "danger",
  other: "default",
};

const typeIcons: Record<string, React.ReactNode> = {
  course: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  article: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  video: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  project: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  other: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

interface LearningCardProps {
  learning: LearningEntry;
  employee?: Employee;
  showEmployee?: boolean;
  className?: string;
}

export function LearningCard({
  learning,
  employee,
  showEmployee = false,
  className,
}: LearningCardProps) {
  const formattedDate = new Date(learning.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const duration = learning.duration_minutes
    ? learning.duration_minutes >= 60
      ? `${Math.floor(learning.duration_minutes / 60)}h ${learning.duration_minutes % 60}m`
      : `${learning.duration_minutes}m`
    : null;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Type Icon */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              {
                "bg-emerald-100 text-emerald-600": learning.type === "course",
                "bg-blue-100 text-blue-600": learning.type === "article",
                "bg-amber-100 text-amber-600": learning.type === "video",
                "bg-red-100 text-red-600": learning.type === "project",
                "bg-slate-100 text-slate-600": learning.type === "other",
              }
            )}
          >
            {typeIcons[learning.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/learnings/${learning.uid}`}
                  className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1"
                >
                  {learning.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{formattedDate}</span>
                  {duration && (
                    <>
                      <span>•</span>
                      <span>{duration}</span>
                    </>
                  )}
                  <Badge variant={typeColors[learning.type]}>
                    {learning.type}
                  </Badge>
                </div>
              </div>

              {learning.source_url && (
                <a
                  href={learning.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>

            {/* Tags */}
            {learning.tags && learning.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {learning.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
                {learning.tags.length > 5 && (
                  <span className="text-xs text-slate-400">
                    +{learning.tags.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Employee (for team/org views) */}
            {showEmployee && employee && (
              <div className="mt-3 flex items-center gap-2">
                <Avatar
                  src={employee.avatar_url}
                  fallback={employee.name}
                  size="sm"
                />
                <span className="text-sm text-slate-600">{employee.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

