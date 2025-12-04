import { NextRequest, NextResponse } from "next/server";
import {
  validateInvitationToken,
  acceptInvitation,
} from "@/lib/contentstack/invitations";
import { getEmployeeByEmail, updateEmployee } from "@/lib/contentstack/employees";

// POST /api/invitations/accept - Accept invitation
// Note: This endpoint is used after Google OAuth sign-in
// The actual Google linking happens in the NextAuth signIn callback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Validate invitation
    const result = await validateInvitationToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.reason },
        { status: 400 }
      );
    }

    const invitation = result.invitation!;

    // Get the employee entry (created when invitation was sent)
    const employee = await getEmployeeByEmail(invitation.email);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // Update employee name if provided
    if (name && name !== employee.name) {
      await updateEmployee(employee.uid, { name });
    }

    // Mark invitation as accepted
    await acceptInvitation(invitation.uid);

    // Return success - the user should now sign in with Google
    // The NextAuth signIn callback will link their Google ID
    return NextResponse.json({
      success: true,
      message: "Invitation accepted. Please sign in with Google to complete registration.",
      email: invitation.email,
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

