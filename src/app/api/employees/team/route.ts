import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isManager } from "@/lib/auth/rbac";
import { getEmployeesByTeam } from "@/lib/contentstack/employees";
import { getTeamsByManager } from "@/lib/contentstack/teams";

// GET /api/employees/team - Get team members (for managers)
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all teams managed by this user
    const teams = await getTeamsByManager(session.user.employeeUid);

    // Get members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await getEmployeesByTeam(team.uid);
        return {
          ...team,
          members,
        };
      })
    );

    return NextResponse.json({ teams: teamsWithMembers });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

