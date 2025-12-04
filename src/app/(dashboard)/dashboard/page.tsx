"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { LearningCard } from "@/components/learning-card";
import { EmptyState } from "@/components/empty-state";
import type { LearningEntry, EmployeeStats } from "@/lib/contentstack/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [recentLearnings, setRecentLearnings] = useState<LearningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, learningsRes] = await Promise.all([
          fetch("/api/stats/me"),
          fetch("/api/learnings?scope=me&limit=5"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }

        if (learningsRes.ok) {
          const learningsData = await learningsRes.json();
          setRecentLearnings(learningsData.learnings || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s your learning progress for the last 30 days
          </p>
        </div>
        <Link href="/learnings/new">
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Learning
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Learnings"
          value={stats?.total_learnings || 0}
          subtitle="This month"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
        />
        <StatsCard
          title="Hours Invested"
          value={stats?.total_hours || 0}
          subtitle="Total time spent"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Courses"
          value={stats?.learnings_by_type?.course || 0}
          subtitle="Completed"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Top Skill"
          value={stats?.top_tags?.[0]?.tag || "—"}
          subtitle={
            stats?.top_tags?.[0]
              ? `${stats.top_tags[0].count} entries`
              : "Start learning!"
          }
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />
      </div>

      {/* Learning by Type */}
      {stats && Object.keys(stats.learnings_by_type || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learning by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.learnings_by_type).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2"
                >
                  <span className="capitalize text-slate-700">{type}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Tags */}
      {stats && stats.top_tags && stats.top_tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.top_tags.map(({ tag, count }) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1"
                >
                  <span className="text-sm text-emerald-700">{tag}</span>
                  <span className="text-xs text-emerald-500">({count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Learnings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Learnings
          </h2>
          <Link
            href="/learnings"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all →
          </Link>
        </div>

        {recentLearnings.length > 0 ? (
          <div className="space-y-3">
            {recentLearnings.map((learning) => (
              <LearningCard key={learning.uid} learning={learning} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              }
              title="No learnings yet"
              description="Start tracking your learning journey by adding your first entry"
              action={{
                label: "Add Learning",
                onClick: () => (window.location.href = "/learnings/new"),
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

