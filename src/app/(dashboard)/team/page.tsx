"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  ActivityChart,
  TypeDistributionChart,
  HoursByTypeChart,
} from "@/components/charts";
import type { Team, Employee, TopLearnerEntry } from "@/lib/contentstack/types";

interface TeamWithMembers extends Team {
  members: Employee[];
}

interface LearningByDate {
  date: string;
  count: number;
  hours: number;
}

interface TeamStats {
  total_learnings: number;
  total_hours: number;
  learnings_by_type: Record<string, number>;
  hours_by_type: Record<string, number>;
  active_learners: number;
  top_learners: TopLearnerEntry[];
  learnings_by_date: LearningByDate[];
}

export default function TeamOverviewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "org_admin";

  useEffect(() => {
    if (!isManager) {
      router.push("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const teamsRes = await fetch("/api/employees/team");
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams || []);

          // Fetch stats for the first team
          if (teamsData.teams?.length > 0) {
            const statsRes = await fetch(
              `/api/stats/team/${teamsData.teams[0].uid}`
            );
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setStats(statsData.stats);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch team data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isManager, router]);

  if (!isManager) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900">Team Overview</h1>
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            title="No teams found"
            description="You don't have any teams assigned yet"
          />
        </Card>
      </div>
    );
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Overview</h1>
          <p className="text-slate-500 mt-1">
            Manage your team and track their learning progress
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/team/learnings">
            <Button variant="outline">View Learnings</Button>
          </Link>
          <Link href="/team/manage">
            <Button>Manage Team</Button>
          </Link>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Team Members</p>
                <p className="text-4xl font-bold mt-1">{totalMembers}</p>
                <p className="text-blue-200 text-xs mt-2">
                  {stats?.active_learners || 0} active learners
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Learnings</p>
                <p className="text-4xl font-bold mt-1">{stats?.total_learnings || 0}</p>
                <p className="text-emerald-200 text-xs mt-2">Last 30 days</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Hours Invested</p>
                <p className="text-4xl font-bold mt-1">{stats?.total_hours || 0}</p>
                <p className="text-violet-200 text-xs mt-2">Team total</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Teams</p>
                <p className="text-4xl font-bold mt-1">{teams.length}</p>
                <p className="text-amber-200 text-xs mt-2">Under your management</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Team Learning Activity
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

        {/* Type Distribution */}
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
          <CardContent className="h-[200px]">
            {stats?.learnings_by_type && Object.keys(stats.learnings_by_type).length > 0 ? (
              <TypeDistributionChart data={stats.learnings_by_type} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hours by Type & Top Learners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hours by Type */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Hours by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            {stats?.hours_by_type && Object.keys(stats.hours_by_type).length > 0 ? (
              <HoursByTypeChart data={stats.hours_by_type} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Learners Leaderboard */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Top Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.top_learners && stats.top_learners.length > 0 ? (
              <div className="space-y-3">
                {stats.top_learners.slice(0, 5).map((learner, index) => (
                  <div
                    key={learner.uid}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                          ? "bg-slate-200 text-slate-600"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {learner.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {learner.count}
                      </p>
                      <p className="text-xs text-slate-500">{learner.hours}h</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-sm text-slate-400">
                No learner data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      {teams.map((team) => (
        <Card key={team.uid}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{team.name}</CardTitle>
              <Badge variant="success">{team.members.length} members</Badge>
            </div>
            {team.description && (
              <p className="text-sm text-slate-500 mt-1">{team.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {team.members.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {team.members.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <Avatar
                      src={member.avatar_url}
                      fallback={member.name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {member.name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">
                No members in this team yet
              </p>
            )}
          </CardContent>
        </Card>
      ))}

    </div>
  );
}

