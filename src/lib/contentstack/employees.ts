import { Query } from "contentstack";
import {
  getDeliveryClient,
  getStack,
  getManagementContentType,
  CONTENT_TYPES,
  getEnvironment,
  getLocale,
} from "./client";
import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilters,
  EmployeeEntryData,
  ContentstackReference,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";

// Query employees using Delivery SDK
export async function getEmployees(filters?: EmployeeFilters): Promise<Employee[]> {
  const client = getDeliveryClient();
  let query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query();

  if (filters?.role) {
    query = query.where("role", filters.role);
  }
  if (filters?.status) {
    query = query.where("status", filters.status);
  }
  // Reference fields need referenceIn query
  if (filters?.team_uid) {
    const refQuery = client.ContentType(CONTENT_TYPES.TEAM).Query().where("uid", filters.team_uid);
    query = query.referenceIn("team", refQuery);
  }
  if (filters?.manager_uid) {
    const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", filters.manager_uid);
    query = query.referenceIn("manager", refQuery);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.skip) {
    query = query.skip(filters.skip);
  }

  const result = await query.toJSON().find();
  // Delivery SDK returns [entries, count] tuple
  const entries = result[0] as Employee[] | undefined;
  return entries ?? [];
}

// Get single employee by UID
export async function getEmployeeByUid(uid: string): Promise<Employee | null> {
  const client = getDeliveryClient();
  try {
    const result = await client
      .ContentType(CONTENT_TYPES.EMPLOYEE)
      .Entry(uid)
      .toJSON()
      .fetch();
    return result as Employee;
  } catch {
    return null;
  }
}

// Get employee by Google ID
export async function getEmployeeByGoogleId(googleId: string): Promise<Employee | null> {
  const client = getDeliveryClient();
  const query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query();
  const result = await query.where("google_id", googleId).toJSON().find();

  const entries = result[0] as Employee[] | undefined;
  return entries?.[0] ?? null;
}

// Get employee by email
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const client = getDeliveryClient();
  const query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query();
  const result = await query.where("email", email.toLowerCase()).toJSON().find();

  const entries = result[0] as Employee[] | undefined;
  return entries?.[0] ?? null;
}

// Get employees by team
export async function getEmployeesByTeam(teamUid: string): Promise<Employee[]> {
  const client = getDeliveryClient();
  const refQuery = client.ContentType(CONTENT_TYPES.TEAM).Query().where("uid", teamUid);
  const query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query();
  const result = await query
    .referenceIn("team", refQuery)
    .where("status", "active")
    .toJSON()
    .find();

  const entries = result[0] as Employee[] | undefined;
  return entries ?? [];
}

// Get employees by manager
export async function getEmployeesByManager(managerUid: string): Promise<Employee[]> {
  const client = getDeliveryClient();
  const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", managerUid);
  const query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query();
  const result = await query
    .referenceIn("manager", refQuery)
    .where("status", "active")
    .toJSON()
    .find();

  const entries = result[0] as Employee[] | undefined;
  return entries ?? [];
}

// Helper to build manager reference
function buildManagerReference(managerUid: string): ContentstackReference[] {
  return [{ uid: managerUid, _content_type_uid: CONTENT_TYPES.EMPLOYEE }];
}

// Helper to build team reference
function buildTeamReference(teamUid: string): ContentstackReference[] {
  return [{ uid: teamUid, _content_type_uid: CONTENT_TYPES.TEAM }];
}

// Helper to wait for entry to be available in Delivery API (handles propagation delay)
async function waitForEmployee(uid: string, maxRetries = 5, delayMs = 1000): Promise<Employee> {
  for (let i = 0; i < maxRetries; i++) {
    const entry = await getEmployeeByUid(uid);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Employee not available after publishing. Please refresh.");
}

// Create employee using Management SDK
export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE);

  const entryData: EmployeeEntryData = {
    title: input.name,
    google_id: input.google_id,
    email: input.email.toLowerCase(),
    name: input.name,
    avatar_url: input.avatar_url ?? "",
    role: input.role ?? "employee",
    status: input.status ?? "active",
  };

  // Add manager reference if provided
  if (input.manager_uid) {
    entryData.manager = buildManagerReference(input.manager_uid);
  }

  // Add team reference if provided
  if (input.team_uid) {
    entryData.team = buildTeamReference(input.team_uid);
  }

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

  // Publish the entry
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for entry to be available in Delivery API
  return await waitForEmployee(entry.uid);
}

// Update employee using Management SDK
export async function updateEmployee(
  uid: string,
  input: UpdateEmployeeInput
): Promise<Employee> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  // Apply updates to entry object
  if (input.name !== undefined) {
    Object.assign(entry, { title: input.name, name: input.name });
  }
  if (input.avatar_url !== undefined) {
    Object.assign(entry, { avatar_url: input.avatar_url });
  }
  if (input.role !== undefined) {
    Object.assign(entry, { role: input.role });
  }
  if (input.status !== undefined) {
    Object.assign(entry, { status: input.status });
  }

  // Handle manager reference
  if (input.manager_uid === null) {
    Object.assign(entry, { manager: [] });
  } else if (input.manager_uid !== undefined) {
    Object.assign(entry, { manager: buildManagerReference(input.manager_uid) });
  }

  // Handle team reference
  if (input.team_uid === null) {
    Object.assign(entry, { team: [] });
  } else if (input.team_uid !== undefined) {
    Object.assign(entry, { team: buildTeamReference(input.team_uid) });
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
  return await waitForEmployee(uid);
}

// Link Google ID to existing employee (for invite acceptance)
export async function linkGoogleIdToEmployee(
  uid: string,
  googleId: string,
  avatarUrl?: string
): Promise<Employee> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  Object.assign(entry, {
    google_id: googleId,
    status: "active",
    ...(avatarUrl && { avatar_url: avatarUrl }),
  });

  const updated = await entry.update();

  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Wait for updated entry to be available in Delivery API
  return await waitForEmployee(uid);
}
