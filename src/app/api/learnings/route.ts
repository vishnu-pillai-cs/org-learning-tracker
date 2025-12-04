import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isManager } from "@/lib/auth/rbac";
import {
  getLearnings,
  getLearningsByEmployee,
  getLearningsByTeams,
  createLearning,
} from "@/lib/contentstack/learnings";
import { getTeamsByManager } from "@/lib/contentstack/teams";
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
    if (!input.title || !input.type || !input.date) {
      return NextResponse.json(
        { error: "Title, type, and date are required" },
        { status: 400 }
      );
    }

    // Create learning entry linked to current user
    const learning = await createLearning(
      input,
      session.user.employeeUid,
      session.user.teamUid
    );

    return NextResponse.json({ learning }, { status: 201 });
  } catch (error) {
    console.error("Failed to create learning:", error);
    return NextResponse.json(
      { error: "Failed to create learning" },
      { status: 500 }
    );
  }
}

