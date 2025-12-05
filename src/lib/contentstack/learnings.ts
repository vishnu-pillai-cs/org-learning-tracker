import { Query } from "contentstack";
import { nanoid } from "nanoid";
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
  ParsedEmployeeStats,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";
import { cascadeStatsUpdate } from "./stats";

// Helper to build employee reference
function buildEmployeeReference(employeeUid: string): ContentstackReference[] {
  return [{ uid: employeeUid, _content_type_uid: CONTENT_TYPES.EMPLOYEE }];
}

// Helper to wait for entry to be available in Delivery API (handles propagation delay)
async function waitForEntry(
  uid: string,
  maxRetries = 5,
  delayMs = 1000
): Promise<LearningEntry> {
  for (let i = 0; i < maxRetries; i++) {
    const entry = await getLearningByUid(uid);
    if (entry) {
      return entry;
    }
    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Entry not available after publishing. Please refresh to see your learning.");
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

// Create learning entry (internal helper - does not update stats)
async function createLearningEntry(
  input: CreateLearningInput,
  employeeUid: string,
  teamUid?: string
): Promise<LearningEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.LEARNING_ENTRY);

  // Auto-generate unique title for Contentstack, use 'name' field for display
  const uniqueTitle = `learning-${nanoid(12)}`;

  const entryData: LearningEntryData = {
    title: uniqueTitle,
    name: input.title, // User-facing learning title
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

  // Wait for entry to be available in Delivery API (handles propagation delay)
  return await waitForEntry(entry.uid);
}

// Create learning entry (public API - updates stats)
export async function createLearning(
  input: CreateLearningInput,
  employeeUid: string,
  teamUid?: string,
  employeeName?: string,
  teamName?: string
): Promise<LearningEntry> {
  // Create the learning entry
  const learning = await createLearningEntry(input, employeeUid, teamUid);

  // Cascade stats update (fire and don't wait to avoid blocking)
  // Stats are updated in the background
  cascadeStatsUpdate(learning, employeeUid, teamUid, "add", employeeName, teamName).catch((err) => {
    console.error("Failed to cascade stats update:", err);
  });

  return learning;
}

// Create learning and return with updated stats (for immediate UI update)
export async function createLearningWithStats(
  input: CreateLearningInput,
  employeeUid: string,
  teamUid?: string,
  employeeName?: string,
  teamName?: string
): Promise<{ learning: LearningEntry; stats: ParsedEmployeeStats }> {
  // Create the learning entry
  const learning = await createLearningEntry(input, employeeUid, teamUid);

  // Cascade stats update and wait for employee stats
  const statsResult = await cascadeStatsUpdate(learning, employeeUid, teamUid, "add", employeeName, teamName);

  return {
    learning,
    stats: statsResult.employee,
  };
}

// Update learning entry
export async function updateLearning(
  uid: string,
  input: UpdateLearningInput,
  employeeUid?: string,
  teamUid?: string,
  employeeName?: string,
  teamName?: string
): Promise<LearningEntry> {
  // Get the old learning first (for stats adjustment)
  const oldLearning = await getLearningByUid(uid);
  
  const contentType = getManagementContentType(CONTENT_TYPES.LEARNING_ENTRY);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();

  // Update 'name' field (user-facing title), not 'title' (auto-generated unique ID)
  if (input.title !== undefined) {
    Object.assign(entry, { name: input.title });
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

  // Wait for updated entry to be available in Delivery API
  const updatedLearning = await waitForEntry(uid);

  // If type, duration, or date changed, adjust stats
  if (oldLearning && employeeUid) {
    const typeChanged = input.type !== undefined && oldLearning.type !== input.type;
    const durationChanged = input.duration_minutes !== undefined && oldLearning.duration_minutes !== input.duration_minutes;
    const dateChanged = input.date !== undefined && oldLearning.date !== input.date;

    if (typeChanged || durationChanged || dateChanged) {
      // Decrement old values, increment new values
      const empUid = employeeUid || oldLearning.employee[0]?.uid;
      const tUid = teamUid || oldLearning.team?.[0]?.uid;
      
      if (empUid) {
        // Remove old stats contribution
        cascadeStatsUpdate(oldLearning, empUid, tUid, "remove", employeeName, teamName).catch((err) => {
          console.error("Failed to remove old stats:", err);
        });
        // Add new stats contribution
        cascadeStatsUpdate(updatedLearning, empUid, tUid, "add", employeeName, teamName).catch((err) => {
          console.error("Failed to add new stats:", err);
        });
      }
    }
  }

  return updatedLearning;
}

// Delete learning entry
export async function deleteLearning(
  uid: string,
  employeeUid?: string,
  teamUid?: string,
  employeeName?: string,
  teamName?: string
): Promise<void> {
  // Get the learning first (need values for stats decrement)
  const learning = await getLearningByUid(uid);
  
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

  // Cascade stats decrement
  if (learning) {
    const empUid = employeeUid || learning.employee[0]?.uid;
    const tUid = teamUid || learning.team?.[0]?.uid;
    
    if (empUid) {
      cascadeStatsUpdate(learning, empUid, tUid, "remove", employeeName, teamName).catch((err) => {
        console.error("Failed to cascade stats decrement:", err);
      });
    }
  }
}

// Helper to calculate streaks from learning dates
function calculateStreaks(learnings: LearningEntry[]): { current: number; longest: number } {
  if (learnings.length === 0) return { current: 0, longest: 0 };

  // Get unique dates sorted descending (most recent first)
  const uniqueDates = [...new Set(learnings.map((l) => l.date))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (uniqueDates.length === 0) return { current: 0, longest: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecentDate = new Date(uniqueDates[0]);
  mostRecentDate.setHours(0, 0, 0, 0);

  // Check if streak is still active (learned today or yesterday)
  const isStreakActive =
    mostRecentDate.getTime() === today.getTime() ||
    mostRecentDate.getTime() === yesterday.getTime();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate streaks
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
      continue;
    }

    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.round(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (i === 1 || (i > 1 && currentStreak === 0)) {
        currentStreak = isStreakActive ? tempStreak : 0;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  // Final check for last streak
  longestStreak = Math.max(longestStreak, tempStreak);
  if (currentStreak === 0 && isStreakActive) {
    currentStreak = tempStreak;
  }

  return { current: currentStreak, longest: longestStreak };
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

  // Hours by type
  const hoursByType = learnings.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + (l.duration_minutes ?? 0) / 60;
      return acc;
    },
    {} as Record<string, number>
  );

  // Round hours by type
  Object.keys(hoursByType).forEach((key) => {
    hoursByType[key] = Math.round(hoursByType[key] * 10) / 10;
  });

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

  // Build learnings by date for time-series chart
  const learningsByDate: Record<string, { count: number; hours: number }> = {};
  
  // Initialize all dates in range with zero values
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    learningsByDate[dateStr] = { count: 0, hours: 0 };
  }

  // Populate with actual data
  learnings.forEach((l) => {
    const dateStr = l.date.split("T")[0];
    if (learningsByDate[dateStr]) {
      learningsByDate[dateStr].count++;
      learningsByDate[dateStr].hours += (l.duration_minutes ?? 0) / 60;
    }
  });

  // Convert to sorted array (oldest first for chart)
  const learningsByDateArray = Object.entries(learningsByDate)
    .map(([date, data]) => ({
      date,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate streaks (need all learnings for accurate streak, not just last 30 days)
  const allLearnings = await getLearningsByEmployee(employeeUid, { limit: 500 });
  const streaks = calculateStreaks(allLearnings);

  // Average session length
  const avgSessionMinutes =
    learnings.length > 0
      ? Math.round(
          learnings.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0) /
            learnings.length
        )
      : 0;

  return {
    total_learnings: learnings.length,
    total_hours: Math.round(totalHours * 10) / 10,
    learnings_by_type: byType,
    hours_by_type: hoursByType,
    top_tags: topTags,
    recent_learnings: learnings.slice(0, 5),
    learnings_by_date: learningsByDateArray,
    current_streak: streaks.current,
    longest_streak: streaks.longest,
    avg_session_minutes: avgSessionMinutes,
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
