import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isManager, isAdmin } from "@/lib/auth/rbac";
import { getEmployeesByTeam } from "@/lib/contentstack/employees";
import { getTeamsByManager, getTeams } from "@/lib/contentstack/teams";

// GET /api/employees/team - Get team members (for managers and org admins)
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Org admins see all teams, managers see only their teams
    const teams = isAdmin(session.user.role)
      ? await getTeams("active")
      : await getTeamsByManager(session.user.employeeUid);

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

