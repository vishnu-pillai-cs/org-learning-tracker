import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isManager } from "@/lib/auth/rbac";
import {
  getLearnings,
  getLearningsByEmployee,
  getLearningsByTeams,
  createLearningWithStats,
} from "@/lib/contentstack/learnings";
import { getTeamsByManager, getTeamByUid } from "@/lib/contentstack/teams";
import type { CreateLearningInput, LearningFilters, LearningEntry } from "@/lib/contentstack/types";

// GET /api/learnings - Get learnings (filtered by role)
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const filters: LearningFilters = {};

    // Parse query params
    const type = searchParams.get("type");
    const visibility = searchParams.get("visibility");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");
    const scope = searchParams.get("scope"); // "me", "team", "org"

    if (type) filters.type = type as LearningFilters["type"];
    if (visibility) filters.visibility = visibility as LearningFilters["visibility"];
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    if (limit) filters.limit = parseInt(limit);
    if (skip) filters.skip = parseInt(skip);

    let learnings: LearningEntry[];

    // Determine scope based on user role and query param
    const effectiveScope = scope || "me";

    switch (effectiveScope) {
      case "org":
        if (!isAdmin(session.user.role)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        learnings = await getLearnings(filters);
        break;

      case "team":
        if (!isManager(session.user.role)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const teams = await getTeamsByManager(session.user.employeeUid);
        const teamUids = teams.map((t) => t.uid);
        if (teamUids.length === 0) {
          learnings = [];
        } else {
          learnings = await getLearningsByTeams(teamUids, filters);
        }
        break;

      case "me":
      default:
        learnings = await getLearningsByEmployee(session.user.employeeUid, filters);
        break;
    }

    return NextResponse.json({ learnings });
  } catch (error) {
    console.error("Failed to fetch learnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch learnings" },
      { status: 500 }
    );
  }
}

// POST /api/learnings - Create learning entry
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const input: CreateLearningInput = {
      title: body.title,
      description: body.description,
      type: body.type,
      source_url: body.source_url,
      date: body.date,
      duration_minutes: body.duration_minutes,
      tags: body.tags,
      visibility: body.visibility,
    };

    // Validate required fields
    if (!input.title || !input.type || !input.date || !input.duration_minutes) {
      return NextResponse.json(
        { error: "Title, type, date, and duration are required" },
        { status: 400 }
      );
    }

    // Get team name if team exists (for stats tracking)
    let teamName: string | undefined;
    if (session.user.teamUid) {
      const team = await getTeamByUid(session.user.teamUid);
      teamName = team?.name;
    }

    // Create learning entry with stats update and return both
    const result = await createLearningWithStats(
      input,
      session.user.employeeUid,
      session.user.teamUid,
      session.user.name,
      teamName
    );

    // Transform stats for dashboard format
    const dashboardStats = {
      total_learnings: result.stats.total_learnings,
      total_hours: result.stats.total_hours,
      learnings_by_type: result.stats.learnings_by_type,
      hours_by_type: result.stats.hours_by_type,
      learnings_by_date: result.stats.activity_dates.map((d) => ({
        date: d.date,
        count: d.count,
        hours: Math.round((d.minutes / 60) * 10) / 10,
      })),
      current_streak: result.stats.current_streak,
      longest_streak: result.stats.longest_streak,
      avg_session_minutes: result.stats.avg_session_minutes,
      top_tags: [], // Not tracked in pre-computed stats
      recent_learnings: [], // Not stored in pre-computed stats
    };

    return NextResponse.json(
      { learning: result.learning, stats: dashboardStats },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create learning:", error);
    return NextResponse.json(
      { error: "Failed to create learning" },
      { status: 500 }
    );
  }
}

