import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTeam } from "@/lib/auth/rbac";
import { getEmployeesByTeam, updateEmployee } from "@/lib/contentstack/employees";

// GET /api/teams/[uid]/members - Get team members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  try {
    const members = await getEmployeesByTeam(uid);
    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST /api/teams/[uid]/members - Add member to team
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid: teamUid } = await params;

  try {
    // Check if user can manage this team
    const canManage = await canManageTeam(
      session.user.employeeUid,
      session.user.role,
      teamUid
    );

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { employee_uid } = body;

    if (!employee_uid) {
      return NextResponse.json(
        { error: "employee_uid is required" },
        { status: 400 }
      );
    }

    // Update employee's team
    const employee = await updateEmployee(employee_uid, {
      team_uid: teamUid,
      manager_uid: session.user.employeeUid,
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Failed to add team member:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}

