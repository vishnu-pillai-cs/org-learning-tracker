import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/rbac";
import { getEmployeeByUid, updateEmployee } from "@/lib/contentstack/employees";
import type { UpdateEmployeeInput } from "@/lib/contentstack/types";

// GET /api/employees/[uid] - Get employee by UID
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
    // Users can view their own profile, admins can view any
    if (uid !== session.user.employeeUid && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await getEmployeeByUid(uid);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/[uid] - Update employee
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  // Only admins can update employees (except their own profile)
  const isOwnProfile = uid === session.user.employeeUid;
  if (!isOwnProfile && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updateData: UpdateEmployeeInput = {};

    // Users can update their own name and avatar
    if (body.name !== undefined) updateData.name = body.name;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;

    // Only admins can update role, status, team, and manager
    if (isAdmin(session.user.role)) {
      if (body.role !== undefined) updateData.role = body.role;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.team_uid !== undefined) updateData.team_uid = body.team_uid;
      if (body.manager_uid !== undefined) updateData.manager_uid = body.manager_uid;
    }

    const employee = await updateEmployee(uid, updateData);

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

