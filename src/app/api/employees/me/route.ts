import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeByUid } from "@/lib/contentstack/employees";

// GET /api/employees/me - Get current user's employee profile
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const employee = await getEmployeeByUid(session.user.employeeUid);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Failed to fetch employee profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee profile" },
      { status: 500 }
    );
  }
}

