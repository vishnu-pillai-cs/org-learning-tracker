import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, isManager } from "@/lib/auth/rbac";
import { getEmployees, getEmployeesByManager } from "@/lib/contentstack/employees";
import type { EmployeeFilters } from "@/lib/contentstack/types";

// GET /api/employees - List employees
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const filters: EmployeeFilters = {};

    // Parse query params
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const team_uid = searchParams.get("team_uid");
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");

    if (role) filters.role = role as EmployeeFilters["role"];
    if (status) filters.status = status as EmployeeFilters["status"];
    if (team_uid) filters.team_uid = team_uid;
    if (limit) filters.limit = parseInt(limit);
    if (skip) filters.skip = parseInt(skip);

    let employees;

    if (isAdmin(session.user.role)) {
      // Admin can see all employees
      employees = await getEmployees(filters);
    } else if (isManager(session.user.role)) {
      // Manager can only see their direct reports
      employees = await getEmployeesByManager(session.user.employeeUid);
    } else {
      // Regular employees can't list other employees
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

