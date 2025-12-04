import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canViewTeam } from "@/lib/auth/rbac";
import { getTeamLearningStats } from "@/lib/contentstack/learnings";

// GET /api/stats/team/[uid] - Get team stats
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

