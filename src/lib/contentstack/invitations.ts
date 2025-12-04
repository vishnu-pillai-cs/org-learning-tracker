import { nanoid } from "nanoid";
import { Query } from "contentstack";
import {
  getDeliveryClient,
  getManagementContentType,
  CONTENT_TYPES,
  getEnvironment,
  getLocale,
} from "./client";
import type {
  Invitation,
  CreateInvitationInput,
  EmployeeRole,
  InvitationEntryData,
  EmployeeEntryData,
  ContentstackReference,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";

// Helper to build employee reference
function buildEmployeeReference(employeeUid: string): ContentstackReference[] {
  return [{ uid: employeeUid, _content_type_uid: CONTENT_TYPES.EMPLOYEE }];
}

// Helper to build team reference
function buildTeamReference(teamUid: string): ContentstackReference[] {
  return [{ uid: teamUid, _content_type_uid: CONTENT_TYPES.TEAM }];
}

// Get invitation by token
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const client = getDeliveryClient();
  const query: Query = client.ContentType(CONTENT_TYPES.INVITATION).Query();
  const result = await query.where("token", token).toJSON().find();

  const entries = result[0] as Invitation[] | undefined;
  return entries?.[0] ?? null;
}

// Get invitation by UID
export async function getInvitationByUid(uid: string): Promise<Invitation | null> {
  const client = getDeliveryClient();
  try {
    const result = await client
      .ContentType(CONTENT_TYPES.INVITATION)
      .Entry(uid)
      .toJSON()
      .fetch();
    return result as Invitation;
  } catch {
    return null;
  }
}

// Get pending invitations by team
export async function getPendingInvitationsByTeam(teamUid: string): Promise<Invitation[]> {
  const client = getDeliveryClient();
  const refQuery = client.ContentType(CONTENT_TYPES.TEAM).Query().where("uid", teamUid);
  const query: Query = client.ContentType(CONTENT_TYPES.INVITATION).Query();
  const result = await query
    .referenceIn("team", refQuery)
    .where("status", "pending")
    .toJSON()
    .find();

  const entries = result[0] as Invitation[] | undefined;
  return entries ?? [];
}

// Get pending invitations by inviter
export async function getPendingInvitationsByInviter(
  inviterUid: string
): Promise<Invitation[]> {
  const client = getDeliveryClient();
  const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", inviterUid);
  const query: Query = client.ContentType(CONTENT_TYPES.INVITATION).Query();
  const result = await query
    .referenceIn("invited_by", refQuery)
    .where("status", "pending")
    .toJSON()
    .find();

  const entries = result[0] as Invitation[] | undefined;
  return entries ?? [];
}

// Get all pending invitations (for admins)
export async function getAllPendingInvitations(): Promise<Invitation[]> {
  const client = getDeliveryClient();
  const query: Query = client.ContentType(CONTENT_TYPES.INVITATION).Query();
  const result = await query
    .where("status", "pending")
    .descending("created_at")
    .toJSON()
    .find();

  const entries = result[0] as Invitation[] | undefined;
  return entries ?? [];
}

// Check if invitation is valid (not expired, not already used)
export function isInvitationValid(invitation: Invitation): {
  valid: boolean;
  reason?: string;
} {
  if (invitation.status !== "pending") {
    return {
      valid: false,
      reason: `Invitation has already been ${invitation.status}`,
    };
  }

  const expiresAt = new Date(invitation.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, reason: "Invitation has expired" };
  }

  return { valid: true };
}

// Validate invitation token and return invitation details
export async function validateInvitationToken(token: string): Promise<{
  valid: boolean;
  invitation?: Invitation;
  reason?: string;
}> {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, reason: "Invalid invitation token" };
  }

  const validation = isInvitationValid(invitation);
  if (!validation.valid) {
    return { valid: false, reason: validation.reason };
  }

  return { valid: true, invitation };
}

// Helper to wait for entry to be available in Delivery API (handles propagation delay)
async function waitForInvitation(uid: string, maxRetries = 5, delayMs = 1000): Promise<Invitation> {
  for (let i = 0; i < maxRetries; i++) {
    const entry = await getInvitationByUid(uid);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Invitation not available after publishing. Please refresh.");
}

// Create invitation
export async function createInvitation(
  input: CreateInvitationInput,
  inviterUid: string
): Promise<Invitation> {
  const contentType = getManagementContentType(CONTENT_TYPES.INVITATION);

  // Generate secure token
  const token = nanoid(32);

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const entryData: InvitationEntryData = {
    title: `Invite: ${input.email}`,
    email: input.email.toLowerCase(),
    name: input.name ?? "",
    token,
    role: input.role,
    status: "pending",
    expires_at: expiresAt.toISOString(),
    invited_by: buildEmployeeReference(inviterUid),
  };

  // Add team reference if provided
  if (input.team_uid) {
    entryData.team = buildTeamReference(input.team_uid);
  }

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

  // Publish the entry - this will trigger Contentstack Automate to send email
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for entry to be available in Delivery API
  return await waitForInvitation(entry.uid);
}

// Update invitation status
export async function updateInvitationStatus(
  uid: string,
  status: "accepted" | "expired" | "revoked"
): Promise<Invitation> {
  const contentType = getManagementContentType(CONTENT_TYPES.INVITATION);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  Object.assign(entry, { status });
  const updated = await entry.update();

  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for updated entry to be available in Delivery API
  return await waitForInvitation(uid);
}

// Accept invitation (mark as accepted)
export async function acceptInvitation(uid: string): Promise<Invitation> {
  return updateInvitationStatus(uid, "accepted");
}

// Revoke invitation
export async function revokeInvitation(uid: string): Promise<Invitation> {
  return updateInvitationStatus(uid, "revoked");
}

// Create employee entry for invited user (with status "invited")
export async function createInvitedEmployee(invitation: Invitation): Promise<string> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE);

  const entryData: EmployeeEntryData = {
    title: invitation.name ?? invitation.email,
    google_id: "", // Will be set when user accepts and logs in with Google
    email: invitation.email.toLowerCase(),
    name: invitation.name ?? invitation.email.split("@")[0],
    avatar_url: "",
    role: invitation.role as EmployeeRole,
    status: "invited",
  };

  // Add team reference if invitation has one
  if (invitation.team && invitation.team.length > 0) {
    entryData.team = invitation.team;
  }

  // Add invited_by as manager reference
  if (invitation.invited_by && invitation.invited_by.length > 0) {
    entryData.manager = invitation.invited_by;
  }

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  return entry.uid;
}
