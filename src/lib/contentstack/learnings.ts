import { Query } from "contentstack";
import {
  getDeliveryClient,
  getManagementContentType,
  CONTENT_TYPES,
  getEnvironment,
  getLocale,
} from "./client";
import type {
  LearningEntry,
  CreateLearningInput,
  UpdateLearningInput,
  LearningFilters,
  LearningEntryData,
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

// Query learning entries
export async function getLearnings(filters?: LearningFilters): Promise<LearningEntry[]> {
  const client = getDeliveryClient();
  let query: Query = client.ContentType(CONTENT_TYPES.LEARNING_ENTRY).Query();

  // Reference fields need to be queried by their uid using referenceIn
  if (filters?.employee_uid) {
    const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", filters.employee_uid);
    query = query.referenceIn("employee", refQuery);
  }
  if (filters?.team_uid) {
    const refQuery = client.ContentType(CONTENT_TYPES.TEAM).Query().where("uid", filters.team_uid);
    query = query.referenceIn("team", refQuery);
  }
  if (filters?.type) {
    query = query.where("type", filters.type);
  }
  if (filters?.visibility) {
    query = query.where("visibility", filters.visibility);
  }
  if (filters?.from_date) {
    query = query.greaterThanOrEqualTo("date", filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lessThanOrEqualTo("date", filters.to_date);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.skip) {
    query = query.skip(filters.skip);
  }

  // Sort by date descending (most recent first)
  query = query.descending("date");

  const result = await query.toJSON().find();
  const entries = result[0] as LearningEntry[] | undefined;
  return entries ?? [];
}

// Get single learning entry by UID
export async function getLearningByUid(uid: string): Promise<LearningEntry | null> {
  const client = getDeliveryClient();
  try {
    const result = await client
      .ContentType(CONTENT_TYPES.LEARNING_ENTRY)
      .Entry(uid)
      .toJSON()
      .fetch();
    return result as LearningEntry;
  } catch {
    return null;
  }
}

// Get learnings by employee
export async function getLearningsByEmployee(
  employeeUid: string,
  filters?: Omit<LearningFilters, "employee_uid">
): Promise<LearningEntry[]> {
  return getLearnings({ ...filters, employee_uid: employeeUid });
}

// Get learnings by team
export async function getLearningsByTeam(
  teamUid: string,
  filters?: Omit<LearningFilters, "team_uid">
): Promise<LearningEntry[]> {
  return getLearnings({ ...filters, team_uid: teamUid });
}

// Get learnings for multiple teams (for managers with multiple teams)
export async function getLearningsByTeams(
  teamUids: string[],
  filters?: Omit<LearningFilters, "team_uid">
): Promise<LearningEntry[]> {
  const client = getDeliveryClient();
  let query: Query = client.ContentType(CONTENT_TYPES.LEARNING_ENTRY).Query();
  query = query.containedIn("team", teamUids);

  if (filters?.type) {
    query = query.where("type", filters.type);
  }
  if (filters?.from_date) {
    query = query.greaterThanOrEqualTo("date", filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lessThanOrEqualTo("date", filters.to_date);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.skip) {
    query = query.skip(filters.skip);
  }

  query = query.descending("date");

  const result = await query.toJSON().find();
  const entries = result[0] as LearningEntry[] | undefined;
  return entries ?? [];
}

// Create learning entry
export async function createLearning(
  input: CreateLearningInput,
  employeeUid: string,
  teamUid?: string
): Promise<LearningEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.LEARNING_ENTRY);

  const entryData: LearningEntryData = {
    title: input.title,
    description: input.description ?? "",
    type: input.type,
    source_url: input.source_url ?? "",
    date: input.date,
    duration_minutes: input.duration_minutes ?? 0,
    tags: input.tags ?? [],
    visibility: input.visibility ?? "team",
    employee: buildEmployeeReference(employeeUid),
  };

  // Add team reference if provided
  if (teamUid) {
    entryData.team = buildTeamReference(teamUid);
  }

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

  // Publish the entry
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Fetch the created entry via Delivery SDK to get properly typed data
  const createdLearning = await getLearningByUid(entry.uid);
  if (!createdLearning) {
    throw new Error("Failed to fetch created learning entry");
  }
  return createdLearning;
}

// Update learning entry
export async function updateLearning(
  uid: string,
  input: UpdateLearningInput
): Promise<LearningEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.LEARNING_ENTRY);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  if (input.title !== undefined) {
    Object.assign(entry, { title: input.title });
  }
  if (input.description !== undefined) {
    Object.assign(entry, { description: input.description });
  }
  if (input.type !== undefined) {
    Object.assign(entry, { type: input.type });
  }
  if (input.source_url !== undefined) {
    Object.assign(entry, { source_url: input.source_url });
  }
  if (input.date !== undefined) {
    Object.assign(entry, { date: input.date });
  }
  if (input.duration_minutes !== undefined) {
    Object.assign(entry, { duration_minutes: input.duration_minutes });
  }
  if (input.tags !== undefined) {
    Object.assign(entry, { tags: input.tags });
  }
  if (input.visibility !== undefined) {
    Object.assign(entry, { visibility: input.visibility });
  }

  const updated = await entry.update();

  // Publish the updated entry
  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Fetch the updated entry via Delivery SDK to get properly typed data
  const updatedLearning = await getLearningByUid(uid);
  if (!updatedLearning) {
    throw new Error("Failed to fetch updated learning entry");
  }
  return updatedLearning;
}

// Delete learning entry
export async function deleteLearning(uid: string): Promise<void> {
  const contentType = getManagementContentType(CONTENT_TYPES.LEARNING_ENTRY);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  // Unpublish first
  await entry.unpublish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Then delete
  await entry.delete();
}

// Get learning stats for an employee
export async function getEmployeeLearningStats(employeeUid: string, days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const learnings = await getLearningsByEmployee(employeeUid, {
    from_date: fromDate.toISOString().split("T")[0],
  });

  const totalHours = learnings.reduce(
    (sum, l) => sum + (l.duration_minutes ?? 0) / 60,
    0
  );

  const byType = learnings.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const tagCounts: Record<string, number> = {};
  learnings.forEach((l) => {
    l.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return {
    total_learnings: learnings.length,
    total_hours: Math.round(totalHours * 10) / 10,
    learnings_by_type: byType,
    top_tags: topTags,
    recent_learnings: learnings.slice(0, 5),
  };
}

// Get learning stats for a team
export async function getTeamLearningStats(teamUid: string, days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const learnings = await getLearningsByTeam(teamUid, {
    from_date: fromDate.toISOString().split("T")[0],
  });

  const totalHours = learnings.reduce(
    (sum, l) => sum + (l.duration_minutes ?? 0) / 60,
    0
  );

  const byType = learnings.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const tagCounts: Record<string, number> = {};
  learnings.forEach((l) => {
    l.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Group by employee
  const byEmployee: Record<string, { count: number; hours: number }> = {};
  learnings.forEach((l) => {
    const empUid = l.employee[0]?.uid;
    if (empUid) {
      if (!byEmployee[empUid]) {
        byEmployee[empUid] = { count: 0, hours: 0 };
      }
      byEmployee[empUid].count++;
      byEmployee[empUid].hours += (l.duration_minutes ?? 0) / 60;
    }
  });

  return {
    total_learnings: learnings.length,
    total_hours: Math.round(totalHours * 10) / 10,
    learnings_by_type: byType,
    top_tags: topTags,
    learnings_by_employee: byEmployee,
    recent_learnings: learnings.slice(0, 10),
  };
}

// Get org-wide learning stats
export async function getOrgLearningStats(days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const learnings = await getLearnings({
    from_date: fromDate.toISOString().split("T")[0],
    limit: 1000, // Increase limit for org-wide stats
  });

  const totalHours = learnings.reduce(
    (sum, l) => sum + (l.duration_minutes ?? 0) / 60,
    0
  );

  const byType = learnings.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const tagCounts: Record<string, number> = {};
  learnings.forEach((l) => {
    l.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Group by team
  const byTeam: Record<string, { count: number; hours: number }> = {};
  learnings.forEach((l) => {
    const teamUid = l.team?.[0]?.uid ?? "unassigned";
    if (!byTeam[teamUid]) {
      byTeam[teamUid] = { count: 0, hours: 0 };
    }
    byTeam[teamUid].count++;
    byTeam[teamUid].hours += (l.duration_minutes ?? 0) / 60;
  });

  return {
    total_learnings: learnings.length,
    total_hours: Math.round(totalHours * 10) / 10,
    learnings_by_type: byType,
    top_tags: topTags,
    learnings_by_team: byTeam,
    recent_learnings: learnings.slice(0, 10),
  };
}
