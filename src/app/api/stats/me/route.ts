import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeLearningStats } from "@/lib/contentstack/learnings";

// GET /api/stats/me - Get personal stats
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
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

