import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canInvite, getAllowedInviteRoles } from "@/lib/auth/rbac";
import {
  createInvitation,
  getAllPendingInvitations,
  getPendingInvitationsByInviter,
  createInvitedEmployee,
} from "@/lib/contentstack/invitations";
import { getEmployeeByEmail } from "@/lib/contentstack/employees";
import type { CreateInvitationInput } from "@/lib/contentstack/types";

// GET /api/invitations - List pending invitations
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canInvite(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invitations =
      session.user.role === "org_admin"
        ? await getAllPendingInvitations()
        : await getPendingInvitationsByInviter(session.user.employeeUid);

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Create new invitation
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canInvite(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, name, role, team_uid } = body as CreateInvitationInput & {
      team_uid?: string;
    };

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Check if role is allowed
    const allowedRoles = getAllowedInviteRoles(session.user.role);
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `You cannot invite users with role: ${role}` },
        { status: 403 }
      );
    }

    // Check if employee already exists
    const existingEmployee = await getEmployeeByEmail(email);
    if (existingEmployee && existingEmployee.status !== "invited") {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create invitation
    const invitation = await createInvitation(
      { email, name, role, team_uid },
      session.user.employeeUid
    );

    // Create employee entry with "invited" status
    if (!existingEmployee) {
      await createInvitedEmployee(invitation);
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

