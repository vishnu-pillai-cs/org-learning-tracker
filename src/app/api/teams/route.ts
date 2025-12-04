import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isManager } from "@/lib/auth/rbac";
import { getTeams, getTeamsByManager, createTeam } from "@/lib/contentstack/teams";
import type { CreateTeamInput, Team } from "@/lib/contentstack/types";

// GET /api/teams - List teams
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let teams: Team[];

    if (isAdmin(session.user.role)) {
      // Admin can see all teams
      teams = await getTeams();
    } else if (isManager(session.user.role)) {
      // Manager can only see their teams
      teams = await getTeamsByManager(session.user.employeeUid);
    } else {
      // Regular employees can see their own team
      // Return empty if no team
      if (session.user.teamUid) {
        const allTeams = await getTeams("active");
        teams = allTeams.filter((t) => t.uid === session.user.teamUid);
      } else {
        teams = [];
      }
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create team (Admin only)
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, manager_uid } = body as CreateTeamInput;

    if (!name || !manager_uid) {
      return NextResponse.json(
        { error: "Name and manager_uid are required" },
        { status: 400 }
      );
    }

    const team = await createTeam({ name, description, manager_uid });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

