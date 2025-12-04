"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { Team, Employee } from "@/lib/contentstack/types";

interface TeamWithMembers extends Team {
  members: Employee[];
}

interface TeamStats {
  total_learnings: number;
  total_hours: number;
  learnings_by_type: Record<string, number>;
  top_tags: { tag: string; count: number }[];
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Team Members"
          value={totalMembers}
          subtitle={`${teams.length} team${teams.length > 1 ? "s" : ""}`}
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Total Learnings"
          value={stats?.total_learnings || 0}
          subtitle="Last 30 days"
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
          subtitle="Team total"
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
          title="Top Skill"
          value={stats?.top_tags?.[0]?.tag || "—"}
          subtitle={
            stats?.top_tags?.[0]
              ? `${stats.top_tags[0].count} entries`
              : "No data yet"
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

      {/* Top Skills */}
      {stats && stats.top_tags && stats.top_tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Skills</CardTitle>
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
    </div>
  );
}

