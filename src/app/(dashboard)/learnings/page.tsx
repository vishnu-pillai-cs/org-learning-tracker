"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { LearningEntry, LearningType } from "@/lib/contentstack/types";

const typeConfig: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  course: { label: "Course", emoji: "📚", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  article: { label: "Article", emoji: "📄", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  video: { label: "Video", emoji: "🎬", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  project: { label: "Project", emoji: "🛠️", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  other: { label: "Other", emoji: "📝", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

function formatDuration(minutes: number | undefined): string {
  if (!minutes) return "—";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchLearnings() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/learnings?scope=me`);
        if (res.ok) {
          const data = await res.json();
          setLearnings(data.learnings || []);
        }
      } catch (error) {
        console.error("Failed to fetch learnings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLearnings();
  }, []);

  // Filter learnings
  const filteredLearnings = useMemo(() => {
    return learnings.filter((learning) => {
      const matchesType = activeType === "all" || learning.type === activeType;
      const matchesSearch = !searchQuery || 
        learning.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        learning.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [learnings, activeType, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = learnings.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) / 60;
    const typeCounts = learnings.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total: learnings.length, totalHours, typeCounts };
  }, [learnings]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Learnings</h1>
          <p className="text-slate-500 mt-1">
            {stats.total} learnings • {stats.totalHours.toFixed(1)} hours invested
          </p>
        </div>
        <Link href="/learnings/new">
          <Button className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Learning
          </Button>
        </Link>
      </div>

      {/* Type Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveType("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeType === "all"
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            All ({stats.total})
          </button>
          {Object.entries(typeConfig).map(([type, config]) => {
            const count = stats.typeCounts[type] || 0;
            if (count === 0 && activeType !== type) return null;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeType === type
                    ? `${config.bg} ${config.text} border ${config.border}`
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <span>{config.emoji}</span>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search learnings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Learnings List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredLearnings.length > 0 ? (
        <div className="space-y-2">
          {filteredLearnings.map((learning, idx) => {
            const config = typeConfig[learning.type] || typeConfig.other;
            return (
              <Link
                key={learning.uid}
                href={`/learnings/${learning.uid}`}
                className="group block"
              >
                <Card className="p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    {/* Type Icon */}
                    <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                      {config.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                            {learning.name}
                          </h3>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-slate-500">
                            <span>{formatDate(learning.date)}</span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDuration(learning.duration_minutes)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            {/* Tags inline */}
                            {learning.tags && learning.tags.length > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <div className="flex items-center gap-1.5">
                                  {learning.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-500"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {learning.tags.length > 3 && (
                                    <span className="text-[11px] text-slate-400">+{learning.tags.length - 3}</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {learning.source_url && (
                            <a
                              href={learning.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          <svg className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            {searchQuery || activeType !== "all" ? (
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <span className="text-3xl">📚</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {searchQuery || activeType !== "all" ? "No matches found" : "No learnings yet"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {searchQuery || activeType !== "all"
              ? "Try adjusting your search or filters"
              : "Start tracking your learning journey today"}
          </p>
          {!searchQuery && activeType === "all" && (
            <Link href="/learnings/new">
              <Button className="gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Learning
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
