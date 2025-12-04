import { Query } from "contentstack";
import {
  getDeliveryClient,
  getManagementContentType,
  CONTENT_TYPES,
  getEnvironment,
  getLocale,
} from "./client";
import type {
  Team,
  CreateTeamInput,
  UpdateTeamInput,
  TeamEntryData,
  ContentstackReference,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";
import { getEmployeesByTeam } from "./employees";

// Helper to build manager reference
function buildManagerReference(managerUid: string): ContentstackReference[] {
  return [{ uid: managerUid, _content_type_uid: CONTENT_TYPES.EMPLOYEE }];
}

// Get all teams
export async function getTeams(status?: "active" | "archived"): Promise<Team[]> {
  const client = getDeliveryClient();
  let query: Query = client.ContentType(CONTENT_TYPES.TEAM).Query();

  if (status) {
    query = query.where("status", status);
  }

  const result = await query.toJSON().find();
  const entries = result[0] as Team[] | undefined;
  return entries ?? [];
}

// Get single team by UID
export async function getTeamByUid(uid: string): Promise<Team | null> {
  const client = getDeliveryClient();
  try {
    const result = await client
      .ContentType(CONTENT_TYPES.TEAM)
      .Entry(uid)
      .toJSON()
      .fetch();
    return result as Team;
  } catch {
    return null;
  }
}

// Get teams by manager UID
export async function getTeamsByManager(managerUid: string): Promise<Team[]> {
  const client = getDeliveryClient();
  const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", managerUid);
  const query: Query = client.ContentType(CONTENT_TYPES.TEAM).Query();
  const result = await query
    .referenceIn("manager", refQuery)
    .where("status", "active")
    .toJSON()
    .find();

  const entries = result[0] as Team[] | undefined;
  return entries ?? [];
}

// Get team with members populated
export async function getTeamWithMembers(teamUid: string) {
  const team = await getTeamByUid(teamUid);
  if (!team) return null;

  const members = await getEmployeesByTeam(teamUid);

  return {
    ...team,
    members,
  };
}

// Helper to wait for entry to be available in Delivery API (handles propagation delay)
async function waitForTeam(uid: string, maxRetries = 5, delayMs = 1000): Promise<Team> {
  for (let i = 0; i < maxRetries; i++) {
    const entry = await getTeamByUid(uid);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Team not available after publishing. Please refresh.");
}

// Create team using Management SDK
export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const contentType = getManagementContentType(CONTENT_TYPES.TEAM);

  const entryData: TeamEntryData = {
    title: input.name,
    name: input.name,
    description: input.description ?? "",
    status: "active",
    manager: buildManagerReference(input.manager_uid),
  };

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

  // Publish the entry
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for entry to be available in Delivery API
  return await waitForTeam(entry.uid);
}

// Update team using Management SDK
export async function updateTeam(uid: string, input: UpdateTeamInput): Promise<Team> {
  const contentType = getManagementContentType(CONTENT_TYPES.TEAM);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  if (input.name !== undefined) {
    Object.assign(entry, { title: input.name, name: input.name });
  }
  if (input.description !== undefined) {
    Object.assign(entry, { description: input.description });
  }
  if (input.status !== undefined) {
    Object.assign(entry, { status: input.status });
  }
  if (input.manager_uid !== undefined) {
    Object.assign(entry, { manager: buildManagerReference(input.manager_uid) });
  }

  const updated = await entry.update();

  // Publish the updated entry
  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for updated entry to be available in Delivery API
  return await waitForTeam(uid);
}

// Archive team (soft delete)
export async function archiveTeam(uid: string): Promise<Team> {
  return updateTeam(uid, { status: "archived" });
}
