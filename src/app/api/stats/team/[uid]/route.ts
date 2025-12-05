import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canViewTeam } from "@/lib/auth/rbac";
import { getTeamStatsParsed, getOrCreateTeamStats, parseTeamStats } from "@/lib/contentstack/stats";
import { getTeamLearningStats } from "@/lib/contentstack/learnings";

// GET /api/stats/team/[uid] - Get team stats (from pre-computed stats)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid: teamUid } = await params;

  try {
    // Check if user can view this team's stats
    const canView = await canViewTeam(
      session.user.employeeUid,
      session.user.role,
      session.user.teamUid,
      teamUid
    );

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const usePrecomputed = searchParams.get("precomputed") !== "false";

    if (usePrecomputed) {
      // Try to get pre-computed stats first
      let stats = await getTeamStatsParsed(teamUid);
      
      // If no pre-computed stats exist, create them
      if (!stats) {
        const entry = await getOrCreateTeamStats(teamUid);
        stats = parseTeamStats(entry);
      }

      // Transform to match expected dashboard format
      const dashboardStats = {
        total_learnings: stats.total_learnings,
        total_hours: stats.total_hours,
        learnings_by_type: stats.learnings_by_type,
        hours_by_type: stats.hours_by_type,
        active_learners: stats.active_learners,
        top_learners: stats.top_learners,
        learnings_by_date: stats.activity_dates.map((d) => ({
          date: d.date,
          count: d.count,
          hours: Math.round((d.minutes / 60) * 10) / 10,
        })),
      };

      return NextResponse.json({ stats: dashboardStats });
    }

    // Fall back to on-the-fly calculation if requested
    const days = parseInt(searchParams.get("days") || "30");
    const stats = await getTeamLearningStats(teamUid, days);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch team stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

