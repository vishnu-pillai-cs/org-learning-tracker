import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTeam } from "@/lib/auth/rbac";
import { updateEmployee, getEmployeeByUid } from "@/lib/contentstack/employees";

// DELETE /api/teams/[uid]/members/[employeeUid] - Remove member from team
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string; employeeUid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid: teamUid, employeeUid } = await params;

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

    // Verify employee is in this team
    const employee = await getEmployeeByUid(employeeUid);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeTeamUid = employee.team?.[0]?.uid;
    if (employeeTeamUid !== teamUid) {
      return NextResponse.json(
        { error: "Employee is not in this team" },
        { status: 400 }
      );
    }

    // Remove employee from team
    const updatedEmployee = await updateEmployee(employeeUid, {
      team_uid: null,
      manager_uid: null,
    });

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}

