import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeStatsParsed, getOrCreateEmployeeStats, parseEmployeeStats } from "@/lib/contentstack/stats";
import { getEmployeeLearningStats } from "@/lib/contentstack/learnings";

// GET /api/stats/me - Get personal stats (from pre-computed stats)
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const usePrecomputed = searchParams.get("precomputed") !== "false";

    if (usePrecomputed) {
      // Try to get pre-computed stats first
      let stats = await getEmployeeStatsParsed(session.user.employeeUid);
      
      // If no pre-computed stats exist, create them and fall back to on-the-fly
      if (!stats) {
        // Create initial stats entry
        const entry = await getOrCreateEmployeeStats(session.user.employeeUid);
        stats = parseEmployeeStats(entry);
      }

      // Transform to match expected dashboard format
      const dashboardStats = {
        total_learnings: stats.total_learnings,
        total_hours: stats.total_hours,
        learnings_by_type: stats.learnings_by_type,
        hours_by_type: stats.hours_by_type,
        top_tags: [], // Tags not tracked in pre-computed stats
        recent_learnings: [], // Not stored in pre-computed stats
        learnings_by_date: stats.activity_dates.map((d) => ({
          date: d.date,
          count: d.count,
          hours: Math.round((d.minutes / 60) * 10) / 10,
        })),
        current_streak: stats.current_streak,
        longest_streak: stats.longest_streak,
        avg_session_minutes: stats.avg_session_minutes,
      };

      return NextResponse.json({ stats: dashboardStats });
    }

    // Fall back to on-the-fly calculation if requested
    const days = parseInt(searchParams.get("days") || "30");
    const stats = await getEmployeeLearningStats(session.user.employeeUid, days);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch personal stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

