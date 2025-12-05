import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/rbac";
import { getOrgStatsParsed, getOrCreateOrgStats, parseOrgStats } from "@/lib/contentstack/stats";
import { getOrgLearningStats } from "@/lib/contentstack/learnings";

// GET /api/stats/org - Get org-wide stats (Admin only, from pre-computed stats)
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const usePrecomputed = searchParams.get("precomputed") !== "false";

    if (usePrecomputed) {
      // Try to get pre-computed stats first
      let stats = await getOrgStatsParsed();
      
      // If no pre-computed stats exist, create them
      if (!stats) {
        const entry = await getOrCreateOrgStats();
        stats = parseOrgStats(entry);
      }

      // Transform to match expected dashboard format
      const dashboardStats = {
        total_learnings: stats.total_learnings,
        total_hours: stats.total_hours,
        learnings_by_type: stats.learnings_by_type,
        hours_by_type: stats.hours_by_type,
        total_active_employees: stats.total_active_employees,
        total_active_teams: stats.total_active_teams,
        top_teams: stats.top_teams,
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
    const stats = await getOrgLearningStats(days);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch org stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

