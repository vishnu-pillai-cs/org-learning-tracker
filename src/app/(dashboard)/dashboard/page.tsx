"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SuggestionThumbnail } from "@/components/suggestion-thumbnail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { LearningCard } from "@/components/learning-card";
import { EmptyState } from "@/components/empty-state";
import {
  ActivityChart,
  TypeDistributionChart,
  HoursByTypeChart,
  StreakCalendar,
} from "@/components/charts";
import {
  useSuggestions,
  useTodos,
  useLearnings,
  useStats,
  useAppDataInitialized,
} from "@/lib/context";
import type { Todo, Suggestion } from "@/lib/context";

// Extract domain name from URL for source display
function getSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "External";
  }
}

// Format minutes to human readable
function formatDuration(minutes?: number): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { initialized } = useAppDataInitialized();

  // Use context hooks
  const {
    suggestions,
    loading: suggestionsLoading,
    isGenerating,
    isNewSuggestion,
    addToTodo,
  } = useSuggestions();

  const {
    pendingTodos,
    loading: todosLoading,
    complete: completeTodo,
    remove: removeTodo,
  } = useTodos();

  const { learnings: recentLearnings, loading: learningsLoading } = useLearnings();

  const { stats, loading: statsLoading } = useStats();

  // Local UI state
  const [addingToTodo, setAddingToTodo] = useState<string | null>(null);
  const [completingTodo, setCompletingTodo] = useState<Todo | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingLoading, setCompletingLoading] = useState(false);

  // Add suggestion to todos
  const handleAddToTodo = async (suggestion: Suggestion) => {
    setAddingToTodo(suggestion.uid);
    try {
      await addToTodo(suggestion);
    } catch (error) {
      console.error("Failed to add to todos:", error);
    } finally {
      setAddingToTodo(null);
    }
  };

  // Open completion confirmation modal
  const handleCompleteClick = (todo: Todo) => {
    setCompletingTodo(todo);
    setShowCompleteModal(true);
  };

  // Confirm completion and navigate to add learning
  const handleConfirmComplete = async () => {
    if (!completingTodo) return;

    setCompletingLoading(true);
    try {
      completeTodo(completingTodo.uid);

      const params = new URLSearchParams();
      params.set("topic", completingTodo.topic);
      params.set("description", completingTodo.reason || "");
      params.set("type", completingTodo.type || "other");
      params.set("source_url", completingTodo.resource.url || "");
      params.set("duration_minutes", completingTodo.estimated_minutes?.toString() || "");
      params.set("todo_uid", completingTodo.uid);

      router.push(`/learnings/new?${params.toString()}`);
    } catch (error) {
      console.error("Failed to complete todo:", error);
      setCompletingLoading(false);
    }
  };

  // Remove todo
  const handleRemoveTodo = async (uid: string) => {
    await removeTodo(uid);
  };

  // Show loading state until initialized
  const isLoading = !initialized || statsLoading || learningsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Calculate pending todo hours
  const pendingTodoHours = pendingTodos.reduce(
    (sum, t) => sum + (t.estimated_minutes || 0) / 60,
    0
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s your learning journey at a glance
          </p>
        </div>
        <Button onClick={() => router.push("/learnings/new")}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Learning
        </Button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1: Hero Stats */}
        {/* Streak Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Current Streak</p>
                <p className="text-4xl font-bold mt-1">
                  {stats?.current_streak || 0}
                  <span className="text-lg ml-1 font-normal text-emerald-200">days</span>
                </p>
                <p className="text-emerald-200 text-xs mt-2">
                  Best: {stats?.longest_streak || 0} days
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Hours Invested</p>
                <p className="text-4xl font-bold mt-1">
                  {stats?.total_hours || 0}
                  <span className="text-lg ml-1 font-normal text-blue-200">hrs</span>
                </p>
                <p className="text-blue-200 text-xs mt-2">
                  Avg: {stats?.avg_session_minutes || 0}min/session
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Learnings Card */}
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Total Learnings</p>
                <p className="text-4xl font-bold mt-1">{stats?.total_learnings || 0}</p>
                <p className="text-violet-200 text-xs mt-2">This month</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Todos Card */}
        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Pending Todos</p>
                <p className="text-4xl font-bold mt-1">{pendingTodos.length}</p>
                <p className="text-amber-200 text-xs mt-2">
                  ~{Math.round(pendingTodoHours * 10) / 10}h estimated
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Charts */}
        {/* Activity Chart - Spans 2 columns */}
        <Card className="md:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Learning Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            {stats?.learnings_by_date && stats.learnings_by_date.length > 0 ? (
              <ActivityChart data={stats.learnings_by_date} dataKey="count" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution - 1 column */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              By Type
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px]">
            {stats?.learnings_by_type && Object.keys(stats.learnings_by_type).length > 0 ? (
              <TypeDistributionChart data={stats.learnings_by_type} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours by Type - 1 column */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Hours by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px]">
            {stats?.hours_by_type && Object.keys(stats.hours_by_type).length > 0 ? (
              <HoursByTypeChart data={stats.hours_by_type} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3: Streak Calendar + Quick Insights */}
        <Card className="md:col-span-2 lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Activity Calendar
              <span className="text-xs text-slate-400 font-normal ml-2">Last 12 months</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {stats?.learnings_by_date ? (
              <StreakCalendar data={stats.learnings_by_date} weeks={52} />
            ) : (
              <div className="flex items-center justify-center h-[100px] text-sm text-slate-400">
                No activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week Stats */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              
              const lastWeekStart = new Date(startOfWeek);
              lastWeekStart.setDate(lastWeekStart.getDate() - 7);
              
              const thisWeekLearnings = stats?.learnings_by_date?.filter(d => {
                const date = new Date(d.date);
                return date >= startOfWeek && date <= today;
              }).reduce((sum, d) => sum + d.count, 0) || 0;
              
              const thisWeekHours = stats?.learnings_by_date?.filter(d => {
                const date = new Date(d.date);
                return date >= startOfWeek && date <= today;
              }).reduce((sum, d) => sum + (d.hours || 0), 0) || 0;
              
              const lastWeekLearnings = stats?.learnings_by_date?.filter(d => {
                const date = new Date(d.date);
                return date >= lastWeekStart && date < startOfWeek;
              }).reduce((sum, d) => sum + d.count, 0) || 0;
              
              const weekDiff = thisWeekLearnings - lastWeekLearnings;
              const isUp = weekDiff >= 0;

              return (
                <div className="flex gap-3 h-full">
                  {/* Learnings count */}
                  <div className="flex-1 flex flex-col justify-between p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-emerald-600 font-medium">Learnings</p>
                      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {isUp ? (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        ) : (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        )}
                        {Math.abs(weekDiff)}
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{thisWeekLearnings}</p>
                  </div>

                  {/* Hours this week */}
                  <div className="flex-1 flex flex-col justify-between p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Hours</p>
                    <p className="text-3xl font-bold text-blue-700 mt-2">{thisWeekHours.toFixed(1)}</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: 3-Panel Learning Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Recent Learnings */}
        <Card className="border border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">Recent Learnings</CardTitle>
              </div>
              <Link href="/learnings" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {recentLearnings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentLearnings.map((learning) => (
                  <Link
                    key={learning.uid}
                    href={`/learnings/${learning.uid}`}
                    className="group flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                      <span className="text-lg">
                        {learning.type === "video" ? "🎬" : learning.type === "article" ? "📄" : learning.type === "course" ? "📚" : learning.type === "project" ? "🛠️" : "📝"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {learning.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">
                          {learning.type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDuration(learning.duration_minutes)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(learning.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                  📚
                </div>
                <p className="text-sm font-medium text-slate-700">No learnings yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Start your journey today</p>
                <Link
                  href="/learnings/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Learning
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Your Todos */}
        <Card className="border border-emerald-200/60 shadow-sm bg-gradient-to-b from-emerald-50/30 to-white overflow-hidden flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-emerald-100/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">Your Todos</CardTitle>
              </div>
              {pendingTodos.length > 0 && (
                <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingTodos.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {todosLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-14 h-14 bg-emerald-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-emerald-100 rounded w-4/5" />
                      <div className="h-3 bg-emerald-50 rounded w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingTodos.length > 0 ? (
              <div className="p-3 space-y-2">
                {pendingTodos.map((todo) => (
                  <div
                    key={todo.uid}
                    className="group p-3 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-md border border-transparent hover:border-emerald-100 bg-white/50"
                  >
                    <div className="flex gap-3">
                      <a 
                        href={todo.resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex-shrink-0 relative group/thumb"
                      >
                        <SuggestionThumbnail imageUrl={todo.resource.imageUrl} topic={todo.topic} size="sm" />
                        <div className="absolute inset-0 rounded-lg bg-emerald-900/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                      <div className="flex-1 min-w-0">
                        <a
                          href={todo.resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <h3 className="font-medium text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {todo.topic}
                          </h3>
                        </a>
                        {todo.reason && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{todo.reason}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                          {todo.estimated_minutes && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDuration(todo.estimated_minutes)}
                            </span>
                          )}
                          {todo.resource.url && (
                            <a
                              href={todo.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <span className="truncate max-w-[60px]">{getSourceFromUrl(todo.resource.url)}</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleCompleteClick(todo)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Done
                          </button>
                          <button
                            onClick={() => handleRemoveTodo(todo.uid)}
                            className="px-2 py-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No todos yet</p>
                <p className="text-xs text-slate-400 mt-1">Add from suggestions to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: AI Suggestions */}
        <Card className="border border-violet-200/60 shadow-sm bg-gradient-to-b from-violet-50/30 to-white overflow-hidden flex flex-col h-[420px]">
          <CardHeader className="pb-3 border-b border-violet-100/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200 ${isGenerating ? 'animate-pulse' : ''}`}>
                  {isGenerating ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">AI Suggestions</CardTitle>
                  <p className="text-[10px] text-slate-500">
                    {isGenerating ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                        </span>
                        Generating...
                      </span>
                    ) : (
                      "Personalized for you"
                    )}
                  </p>
                </div>
              </div>
              {isGenerating && (
                <div className="flex items-end gap-0.5 h-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-purple-400"
                      style={{
                        height: '100%',
                        animation: 'ai-bars 0.8s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {/* Scrollable content */}
            <div className="overflow-y-auto h-full">
              {/* Loading State */}
              {suggestionsLoading && !isGenerating ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-12 h-12 bg-violet-100 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-violet-100 rounded w-4/5" />
                        <div className="h-2.5 bg-violet-50 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="p-3 space-y-2">
                  {suggestions.map((suggestion) => {
                    const isNew = isNewSuggestion(suggestion.uid);
                    return (
                      <div
                        key={suggestion.uid}
                        className={`group p-3 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-md border border-transparent hover:border-violet-100 ${
                          isNew ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200" : "bg-white/50"
                        }`}
                      >
                        <div className="flex gap-3">
                          <a 
                            href={suggestion.resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex-shrink-0 relative group/thumb"
                          >
                            <SuggestionThumbnail imageUrl={suggestion.resource.imageUrl} topic={suggestion.topic} size="sm" />
                            <div className="absolute inset-0 rounded-lg bg-violet-900/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </a>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <a
                                href={suggestion.resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0"
                              >
                                <h3 className="font-medium text-sm text-slate-900 line-clamp-1 group-hover:text-violet-600 transition-colors">
                                  {suggestion.topic}
                                </h3>
                              </a>
                              {isNew && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-100 rounded uppercase tracking-wider">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{suggestion.reason}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-3 text-[10px]">
                                {suggestion.estimated_minutes && (
                                  <span className="flex items-center gap-1 text-violet-600 font-medium">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDuration(suggestion.estimated_minutes)}
                                  </span>
                                )}
                                {suggestion.resource.url && (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <span className="truncate max-w-[60px]">{getSourceFromUrl(suggestion.resource.url)}</span>
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleAddToTodo(suggestion)}
                                disabled={addingToTodo === suggestion.uid}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-violet-500 rounded-lg hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-sm"
                              >
                                {addingToTodo === suggestion.uid ? (
                                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No suggestions yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add learnings to unlock AI recommendations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Confirmation Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setCompletingTodo(null);
        }}
        title="Mark as Completed"
        description="Great job on finishing this learning!"
      >
        <div className="space-y-4">
          {completingTodo && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="font-medium text-slate-900">{completingTodo.topic}</h4>
              {completingTodo.resource.url && (
                <p className="text-xs text-slate-500 mt-1">{getSourceFromUrl(completingTodo.resource.url)}</p>
              )}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Would you like to log this as a completed learning? We&apos;ll take you to the Add Learning form with details pre-filled.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteModal(false);
                setCompletingTodo(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmComplete} isLoading={completingLoading}>
              Log Learning
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
