import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canInvite, isAdmin } from "@/lib/auth/rbac";
import {
  getInvitationByUid,
  revokeInvitation,
} from "@/lib/contentstack/invitations";

// POST /api/invitations/revoke - Revoke an invitation
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
    const { invitation_uid } = body;

    if (!invitation_uid) {
      return NextResponse.json(
        { error: "Invitation UID is required" },
        { status: 400 }
      );
    }

    // Get the invitation
    const invitation = await getInvitationByUid(invitation_uid);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if user can revoke this invitation
    const inviterUid = invitation.invited_by[0]?.uid;
    if (!isAdmin(session.user.role) && inviterUid !== session.user.employeeUid) {
      return NextResponse.json(
        { error: "You can only revoke invitations you created" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot revoke invitation with status: ${invitation.status}` },
        { status: 400 }
      );
    }

    // Revoke the invitation
    const revokedInvitation = await revokeInvitation(invitation_uid);

    return NextResponse.json({ invitation: revokedInvitation });
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}

