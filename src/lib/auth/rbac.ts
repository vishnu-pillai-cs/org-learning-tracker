import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { EmployeeRole, LearningEntry, Team } from "@/lib/contentstack/types";
import { getTeamsByManager } from "@/lib/contentstack/teams";

// Role hierarchy: org_admin > manager > employee
const ROLE_HIERARCHY: Record<EmployeeRole, number> = {
  employee: 1,
  manager: 2,
  org_admin: 3,
};

// Check if user has at least the required role
export function hasRole(userRole: EmployeeRole, requiredRole: EmployeeRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user is at least a manager
export function isManager(role: EmployeeRole): boolean {
  return hasRole(role, "manager");
}

// Check if user is an admin
export function isAdmin(role: EmployeeRole): boolean {
  return role === "org_admin";
}

// Get current session with proper typing
export async function getCurrentSession() {
  const session = await auth();
  return session;
}

// API route wrapper that enforces role requirements
type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, context);
  };
}

export function withRole(roles: EmployeeRole[], handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    const hasRequiredRole = roles.some((role) => hasRole(userRole, role));

    if (!hasRequiredRole) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

// Check if user can access a learning entry
export function canAccessLearning(
  userEmployeeUid: string,
  userRole: EmployeeRole,
  userTeamUid: string | undefined,
  learning: LearningEntry
): boolean {
  // Admin can access everything
  if (isAdmin(userRole)) {
    return true;
  }

  // Owner can always access their own
  const ownerUid = learning.employee[0]?.uid;
  if (ownerUid === userEmployeeUid) {
    return true;
  }

  // Check visibility
  switch (learning.visibility) {
    case "private":
      // Only owner (already checked) or admin can access
      return false;

    case "team":
      // Team members and managers of the team can access
      const learningTeamUid = learning.team?.[0]?.uid;
      if (learningTeamUid && learningTeamUid === userTeamUid) {
        return true;
      }
      // Managers can access their team's learnings (checked below)
      return false;

    case "org":
      // Anyone in the org can access
      return true;

    default:
      return false;
  }
}

// Check if user can modify a learning entry
export function canModifyLearning(
  userEmployeeUid: string,
  userRole: EmployeeRole,
  learning: LearningEntry
): boolean {
  // Admin can modify anything
  if (isAdmin(userRole)) {
    return true;
  }

  // Only owner can modify their own
  const ownerUid = learning.employee[0]?.uid;
  return ownerUid === userEmployeeUid;
}

// Check if user can manage a team
export async function canManageTeam(
  userEmployeeUid: string,
  userRole: EmployeeRole,
  teamUid: string
): Promise<boolean> {
  // Admin can manage any team
  if (isAdmin(userRole)) {
    return true;
  }

  // Manager can only manage their own teams
  if (isManager(userRole)) {
    const userTeams = await getTeamsByManager(userEmployeeUid);
    return userTeams.some((team) => team.uid === teamUid);
  }

  return false;
}

// Check if user can view team data
export async function canViewTeam(
  userEmployeeUid: string,
  userRole: EmployeeRole,
  userTeamUid: string | undefined,
  targetTeamUid: string
): Promise<boolean> {
  // Admin can view any team
  if (isAdmin(userRole)) {
    return true;
  }

  // User is in the team
  if (userTeamUid === targetTeamUid) {
    return true;
  }

  // Manager can view their managed teams
  if (isManager(userRole)) {
    const userTeams = await getTeamsByManager(userEmployeeUid);
    return userTeams.some((team) => team.uid === targetTeamUid);
  }

  return false;
}

// Check if user can invite others
export function canInvite(userRole: EmployeeRole): boolean {
  return isManager(userRole) || isAdmin(userRole);
}

// Check if user can manage employees
export function canManageEmployees(userRole: EmployeeRole): boolean {
  return isAdmin(userRole);
}

// Get allowed roles for invitation based on user's role
export function getAllowedInviteRoles(
  userRole: EmployeeRole
): ("employee" | "manager")[] {
  if (isAdmin(userRole)) {
    return ["employee", "manager"];
  }
  if (isManager(userRole)) {
    return ["employee"];
  }
  return [];
}

