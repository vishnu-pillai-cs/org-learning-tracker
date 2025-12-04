import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageTeam, canViewTeam } from "@/lib/auth/rbac";
import {
  getTeamByUid,
  getTeamWithMembers,
  updateTeam,
} from "@/lib/contentstack/teams";
import type { UpdateTeamInput } from "@/lib/contentstack/types";

// GET /api/teams/[uid] - Get team by UID
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
    // Check if user can view this team
    const canView = await canViewTeam(
      session.user.employeeUid,
      session.user.role,
      session.user.teamUid,
      uid
    );

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await getTeamWithMembers(uid);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[uid] - Update team
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  try {
    // Check if user can manage this team
    const canManage = await canManageTeam(
      session.user.employeeUid,
      session.user.role,
      uid
    );

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: UpdateTeamInput = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.manager_uid !== undefined) updateData.manager_uid = body.manager_uid;

    const team = await updateTeam(uid, updateData);

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

