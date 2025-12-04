import { NextRequest, NextResponse } from "next/server";
import { validateInvitationToken } from "@/lib/contentstack/invitations";

// GET /api/invitations/validate?token=xxx - Validate invitation token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  try {
    const result = await validateInvitationToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, reason: result.reason },
        { status: 400 }
      );
    }

    // Return invitation details (without sensitive info)
    const invitation = result.invitation!;
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Failed to validate invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}

