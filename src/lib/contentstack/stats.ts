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
  LearningType,
  ContentstackReference,
  EmployeeStatsEntry,
  TeamStatsEntry,
  OrgStatsEntry,
  EmployeeStatsEntryData,
  TeamStatsEntryData,
  OrgStatsEntryData,
  ParsedEmployeeStats,
  ParsedTeamStats,
  ParsedOrgStats,
  ActivityDateEntry,
  TopLearnerEntry,
  TopTeamEntry,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";

// ============================================
// Helper Functions
// ============================================

function buildEmployeeReference(employeeUid: string): ContentstackReference[] {
  return [{ uid: employeeUid, _content_type_uid: CONTENT_TYPES.EMPLOYEE }];
}

function buildTeamReference(teamUid: string): ContentstackReference[] {
  return [{ uid: teamUid, _content_type_uid: CONTENT_TYPES.TEAM }];
}

// Parse JSON string safely
function parseJsonField<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

// Get today's date as ISO string (date only)
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================
// Employee Stats Functions
// ============================================

export async function getEmployeeStatsEntry(employeeUid: string): Promise<EmployeeStatsEntry | null> {
  const client = getDeliveryClient();
  try {
    const query: Query = client.ContentType(CONTENT_TYPES.EMPLOYEE_STATS).Query();
    const refQuery = client.ContentType(CONTENT_TYPES.EMPLOYEE).Query().where("uid", employeeUid);
    query.referenceIn("employee", refQuery);
    
    const result = await query.toJSON().find();
    const entries = result[0] as EmployeeStatsEntry[] | undefined;
    return entries?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function createEmployeeStatsEntry(employeeUid: string): Promise<EmployeeStatsEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE_STATS);
  const now = new Date().toISOString();

  const entryData: EmployeeStatsEntryData = {
    title: `stats-${employeeUid}`,
    employee: buildEmployeeReference(employeeUid),
    total_learnings: 0,
    total_minutes: 0,
    current_streak: 0,
    longest_streak: 0,
    last_learning_date: "",
    learnings_by_type: JSON.stringify({}),
    hours_by_type: JSON.stringify({}),
    activity_dates: JSON.stringify([]),
    computed_at: now,
  };

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });
  
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  // Return the created entry
  return {
    uid: entry.uid,
    ...entryData,
    created_at: now,
    updated_at: now,
    created_by: "",
    updated_by: "",
    _version: 1,
    locale: getLocale(),
  } as EmployeeStatsEntry;
}

export async function getOrCreateEmployeeStats(employeeUid: string): Promise<EmployeeStatsEntry> {
  let stats = await getEmployeeStatsEntry(employeeUid);
  if (!stats) {
    stats = await createEmployeeStatsEntry(employeeUid);
  }
  return stats;
}

async function saveEmployeeStats(uid: string, data: Partial<EmployeeStatsEntryData>): Promise<void> {
  const contentType = getManagementContentType(CONTENT_TYPES.EMPLOYEE_STATS);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();
  
  Object.assign(entry, data, { computed_at: new Date().toISOString() });
  
  const updated = await entry.update();
  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });
}

// ============================================
// Team Stats Functions
// ============================================

export async function getTeamStatsEntry(teamUid: string): Promise<TeamStatsEntry | null> {
  const client = getDeliveryClient();
  try {
    const query: Query = client.ContentType(CONTENT_TYPES.TEAM_STATS).Query();
    const refQuery = client.ContentType(CONTENT_TYPES.TEAM).Query().where("uid", teamUid);
    query.referenceIn("team", refQuery);
    
    const result = await query.toJSON().find();
    const entries = result[0] as TeamStatsEntry[] | undefined;
    return entries?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function createTeamStatsEntry(teamUid: string): Promise<TeamStatsEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.TEAM_STATS);
  const now = new Date().toISOString();

  const entryData: TeamStatsEntryData = {
    title: `stats-${teamUid}`,
    team: buildTeamReference(teamUid),
    total_learnings: 0,
    total_minutes: 0,
    active_learners: 0,
    learnings_by_type: JSON.stringify({}),
    hours_by_type: JSON.stringify({}),
    activity_dates: JSON.stringify([]),
    top_learners: JSON.stringify([]),
    computed_at: now,
  };

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });
  
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  return {
    uid: entry.uid,
    ...entryData,
    created_at: now,
    updated_at: now,
    created_by: "",
    updated_by: "",
    _version: 1,
    locale: getLocale(),
  } as TeamStatsEntry;
}

export async function getOrCreateTeamStats(teamUid: string): Promise<TeamStatsEntry> {
  let stats = await getTeamStatsEntry(teamUid);
  if (!stats) {
    stats = await createTeamStatsEntry(teamUid);
  }
  return stats;
}

async function saveTeamStats(uid: string, data: Partial<TeamStatsEntryData>): Promise<void> {
  const contentType = getManagementContentType(CONTENT_TYPES.TEAM_STATS);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();
  
  Object.assign(entry, data, { computed_at: new Date().toISOString() });
  
  const updated = await entry.update();
  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });
}

// ============================================
// Org Stats Functions
// ============================================

const ORG_STATS_TITLE = "org-stats";

export async function getOrgStatsEntry(): Promise<OrgStatsEntry | null> {
  const client = getDeliveryClient();
  try {
    const query: Query = client.ContentType(CONTENT_TYPES.ORG_STATS).Query();
    query.where("title", ORG_STATS_TITLE);
    
    const result = await query.toJSON().find();
    const entries = result[0] as OrgStatsEntry[] | undefined;
    return entries?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function createOrgStatsEntry(): Promise<OrgStatsEntry> {
  const contentType = getManagementContentType(CONTENT_TYPES.ORG_STATS);
  const now = new Date().toISOString();

  const entryData: OrgStatsEntryData = {
    title: ORG_STATS_TITLE,
    total_learnings: 0,
    total_minutes: 0,
    total_active_employees: 0,
    total_active_teams: 0,
    learnings_by_type: JSON.stringify({}),
    hours_by_type: JSON.stringify({}),
    activity_dates: JSON.stringify([]),
    top_teams: JSON.stringify([]),
    top_learners: JSON.stringify([]),
    computed_at: now,
  };

  const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });
  
  await entry.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });

  return {
    uid: entry.uid,
    ...entryData,
    created_at: now,
    updated_at: now,
    created_by: "",
    updated_by: "",
    _version: 1,
    locale: getLocale(),
  } as OrgStatsEntry;
}

export async function getOrCreateOrgStats(): Promise<OrgStatsEntry> {
  let stats = await getOrgStatsEntry();
  if (!stats) {
    stats = await createOrgStatsEntry();
  }
  return stats;
}

async function saveOrgStats(uid: string, data: Partial<OrgStatsEntryData>): Promise<void> {
  const contentType = getManagementContentType(CONTENT_TYPES.ORG_STATS);
  const entry: ManagementEntry = await contentType.entry(uid).fetch();
  
  Object.assign(entry, data, { computed_at: new Date().toISOString() });
  
  const updated = await entry.update();
  await updated.publish({
    publishDetails: {
      locales: [getLocale()],
      environments: [getEnvironment()],
    },
  });
}

// ============================================
// Stats Update Logic
// ============================================

// Update activity dates array (last 90 days)
function updateActivityDates(
  currentDates: ActivityDateEntry[],
  learningDate: string,
  durationMinutes: number,
  action: "add" | "remove"
): ActivityDateEntry[] {
  const dateStr = learningDate.split("T")[0];
  const multiplier = action === "add" ? 1 : -1;
  
  // Copy current dates
  const dates = [...currentDates];
  
  // Find existing entry for this date
  const existingIndex = dates.findIndex((d) => d.date === dateStr);
  
  if (existingIndex >= 0) {
    dates[existingIndex] = {
      ...dates[existingIndex],
      count: Math.max(0, dates[existingIndex].count + multiplier),
      minutes: Math.max(0, dates[existingIndex].minutes + durationMinutes * multiplier),
    };
    
    // Remove if count is 0
    if (dates[existingIndex].count === 0) {
      dates.splice(existingIndex, 1);
    }
  } else if (action === "add") {
    dates.push({
      date: dateStr,
      count: 1,
      minutes: durationMinutes,
    });
  }
  
  // Sort by date descending and keep only last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];
  
  return dates
    .filter((d) => d.date >= cutoffDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Calculate streak from activity dates
function calculateStreak(activityDates: ActivityDateEntry[], lastLearningDate: string | null): { current: number; longest: number } {
  if (activityDates.length === 0 || !lastLearningDate) {
    return { current: 0, longest: 0 };
  }

  // Sort dates ascending
  const sortedDates = [...activityDates]
    .filter((d) => d.count > 0)
    .map((d) => d.date)
    .sort();

  if (sortedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const today = getTodayDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Check if streak is active (last learning was today or yesterday)
  const mostRecentDate = sortedDates[sortedDates.length - 1];
  const isStreakActive = mostRecentDate === today || mostRecentDate === yesterdayStr;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = sortedDates.length - 1; i > 0; i--) {
    const currDate = new Date(sortedDates[i]);
    const prevDate = new Date(sortedDates[i - 1]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (currentStreak === 0 && isStreakActive) {
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  if (currentStreak === 0 && isStreakActive) {
    currentStreak = tempStreak;
  }

  return { current: currentStreak, longest: longestStreak };
}

// Update type breakdown
function updateTypeBreakdown(
  current: Record<string, number>,
  type: LearningType,
  value: number,
  action: "add" | "remove"
): Record<string, number> {
  const updated = { ...current };
  const multiplier = action === "add" ? 1 : -1;
  updated[type] = Math.max(0, (updated[type] ?? 0) + value * multiplier);
  
  // Remove zero entries
  if (updated[type] === 0) {
    delete updated[type];
  }
  
  return updated;
}

// ============================================
// Update Employee Stats
// ============================================

export async function updateEmployeeStats(
  employeeUid: string,
  learning: LearningEntry,
  action: "add" | "remove"
): Promise<ParsedEmployeeStats> {
  const stats = await getOrCreateEmployeeStats(employeeUid);
  const multiplier = action === "add" ? 1 : -1;
  const durationMinutes = learning.duration_minutes ?? 0;
  const learningDate = learning.date;

  // Parse JSON fields
  const learningsByType = parseJsonField<Record<string, number>>(stats.learnings_by_type, {});
  const hoursByType = parseJsonField<Record<string, number>>(stats.hours_by_type, {});
  const activityDates = parseJsonField<ActivityDateEntry[]>(stats.activity_dates, []);

  // Update counters
  const newTotalLearnings = Math.max(0, stats.total_learnings + multiplier);
  const newTotalMinutes = Math.max(0, stats.total_minutes + durationMinutes * multiplier);

  // Update type breakdowns
  const newLearningsByType = updateTypeBreakdown(learningsByType, learning.type, 1, action);
  const newHoursByType = updateTypeBreakdown(
    hoursByType,
    learning.type,
    Math.round((durationMinutes / 60) * 10) / 10,
    action
  );

  // Update activity dates
  const newActivityDates = updateActivityDates(activityDates, learningDate, durationMinutes, action);

  // Determine last learning date
  let newLastLearningDate = stats.last_learning_date || "";
  if (action === "add") {
    const learningDateStr = learningDate.split("T")[0];
    if (!newLastLearningDate || learningDateStr > newLastLearningDate) {
      newLastLearningDate = learningDateStr;
    }
  } else if (newActivityDates.length > 0) {
    newLastLearningDate = newActivityDates[0].date;
  } else {
    newLastLearningDate = "";
  }

  // Calculate streaks
  const streaks = calculateStreak(newActivityDates, newLastLearningDate);
  const newLongestStreak = Math.max(stats.longest_streak, streaks.longest);

  // Save to Contentstack
  await saveEmployeeStats(stats.uid, {
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    current_streak: streaks.current,
    longest_streak: newLongestStreak,
    last_learning_date: newLastLearningDate,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
  });

  // Return parsed stats
  return parseEmployeeStats({
    ...stats,
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    current_streak: streaks.current,
    longest_streak: newLongestStreak,
    last_learning_date: newLastLearningDate,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
    computed_at: new Date().toISOString(),
  });
}

// ============================================
// Update Team Stats
// ============================================

export async function updateTeamStats(
  teamUid: string,
  learning: LearningEntry,
  action: "add" | "remove",
  employeeName?: string
): Promise<ParsedTeamStats> {
  const stats = await getOrCreateTeamStats(teamUid);
  const multiplier = action === "add" ? 1 : -1;
  const durationMinutes = learning.duration_minutes ?? 0;
  const learningDate = learning.date;
  const employeeUid = learning.employee[0]?.uid || "";

  // Parse JSON fields
  const learningsByType = parseJsonField<Record<string, number>>(stats.learnings_by_type, {});
  const hoursByType = parseJsonField<Record<string, number>>(stats.hours_by_type, {});
  const activityDates = parseJsonField<ActivityDateEntry[]>(stats.activity_dates, []);
  const topLearners = parseJsonField<TopLearnerEntry[]>(stats.top_learners, []);

  // Update counters
  const newTotalLearnings = Math.max(0, stats.total_learnings + multiplier);
  const newTotalMinutes = Math.max(0, stats.total_minutes + durationMinutes * multiplier);

  // Update type breakdowns
  const newLearningsByType = updateTypeBreakdown(learningsByType, learning.type, 1, action);
  const newHoursByType = updateTypeBreakdown(
    hoursByType,
    learning.type,
    Math.round((durationMinutes / 60) * 10) / 10,
    action
  );

  // Update activity dates
  const newActivityDates = updateActivityDates(activityDates, learningDate, durationMinutes, action);

  // Update top learners
  const newTopLearners = updateTopLearners(topLearners, employeeUid, employeeName || "Unknown", durationMinutes, action);

  // Count active learners (those with at least 1 learning)
  const activeLearners = newTopLearners.filter((l) => l.count > 0).length;

  // Save to Contentstack
  await saveTeamStats(stats.uid, {
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    active_learners: activeLearners,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
    top_learners: JSON.stringify(newTopLearners),
  });

  return parseTeamStats({
    ...stats,
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    active_learners: activeLearners,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
    top_learners: JSON.stringify(newTopLearners),
    computed_at: new Date().toISOString(),
  });
}

// ============================================
// Update Org Stats
// ============================================

export async function updateOrgStats(
  learning: LearningEntry,
  action: "add" | "remove",
  employeeName?: string,
  teamName?: string
): Promise<ParsedOrgStats> {
  const stats = await getOrCreateOrgStats();
  const multiplier = action === "add" ? 1 : -1;
  const durationMinutes = learning.duration_minutes ?? 0;
  const learningDate = learning.date;
  const employeeUid = learning.employee[0]?.uid || "";
  const teamUid = learning.team?.[0]?.uid || "";

  // Parse JSON fields
  const learningsByType = parseJsonField<Record<string, number>>(stats.learnings_by_type, {});
  const hoursByType = parseJsonField<Record<string, number>>(stats.hours_by_type, {});
  const activityDates = parseJsonField<ActivityDateEntry[]>(stats.activity_dates, []);
  const topLearners = parseJsonField<TopLearnerEntry[]>(stats.top_learners, []);
  const topTeams = parseJsonField<TopTeamEntry[]>(stats.top_teams, []);

  // Update counters
  const newTotalLearnings = Math.max(0, stats.total_learnings + multiplier);
  const newTotalMinutes = Math.max(0, stats.total_minutes + durationMinutes * multiplier);

  // Update type breakdowns
  const newLearningsByType = updateTypeBreakdown(learningsByType, learning.type, 1, action);
  const newHoursByType = updateTypeBreakdown(
    hoursByType,
    learning.type,
    Math.round((durationMinutes / 60) * 10) / 10,
    action
  );

  // Update activity dates
  const newActivityDates = updateActivityDates(activityDates, learningDate, durationMinutes, action);

  // Update top learners and teams
  const newTopLearners = updateTopLearners(topLearners, employeeUid, employeeName || "Unknown", durationMinutes, action);
  const newTopTeams = teamUid
    ? updateTopTeams(topTeams, teamUid, teamName || "Unknown", durationMinutes, action)
    : topTeams;

  // Count active employees and teams
  const activeEmployees = newTopLearners.filter((l) => l.count > 0).length;
  const activeTeams = newTopTeams.filter((t) => t.count > 0).length;

  // Save to Contentstack
  await saveOrgStats(stats.uid, {
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    total_active_employees: activeEmployees,
    total_active_teams: activeTeams,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
    top_learners: JSON.stringify(newTopLearners),
    top_teams: JSON.stringify(newTopTeams),
  });

  return parseOrgStats({
    ...stats,
    total_learnings: newTotalLearnings,
    total_minutes: newTotalMinutes,
    total_active_employees: activeEmployees,
    total_active_teams: activeTeams,
    learnings_by_type: JSON.stringify(newLearningsByType),
    hours_by_type: JSON.stringify(newHoursByType),
    activity_dates: JSON.stringify(newActivityDates),
    top_learners: JSON.stringify(newTopLearners),
    top_teams: JSON.stringify(newTopTeams),
    computed_at: new Date().toISOString(),
  });
}

// ============================================
// Helper: Update Top Learners
// ============================================

function updateTopLearners(
  current: TopLearnerEntry[],
  employeeUid: string,
  employeeName: string,
  durationMinutes: number,
  action: "add" | "remove"
): TopLearnerEntry[] {
  const multiplier = action === "add" ? 1 : -1;
  const learners = [...current];
  
  const existingIndex = learners.findIndex((l) => l.uid === employeeUid);
  
  if (existingIndex >= 0) {
    learners[existingIndex] = {
      ...learners[existingIndex],
      count: Math.max(0, learners[existingIndex].count + multiplier),
      hours: Math.max(0, Math.round((learners[existingIndex].hours + (durationMinutes / 60) * multiplier) * 10) / 10),
    };
    
    // Remove if count is 0
    if (learners[existingIndex].count === 0) {
      learners.splice(existingIndex, 1);
    }
  } else if (action === "add") {
    learners.push({
      uid: employeeUid,
      name: employeeName,
      count: 1,
      hours: Math.round((durationMinutes / 60) * 10) / 10,
    });
  }
  
  // Sort by count descending and keep top 20
  return learners.sort((a, b) => b.count - a.count).slice(0, 20);
}

// ============================================
// Helper: Update Top Teams
// ============================================

function updateTopTeams(
  current: TopTeamEntry[],
  teamUid: string,
  teamName: string,
  durationMinutes: number,
  action: "add" | "remove"
): TopTeamEntry[] {
  const multiplier = action === "add" ? 1 : -1;
  const teams = [...current];
  
  const existingIndex = teams.findIndex((t) => t.uid === teamUid);
  
  if (existingIndex >= 0) {
    teams[existingIndex] = {
      ...teams[existingIndex],
      count: Math.max(0, teams[existingIndex].count + multiplier),
      hours: Math.max(0, Math.round((teams[existingIndex].hours + (durationMinutes / 60) * multiplier) * 10) / 10),
    };
    
    if (teams[existingIndex].count === 0) {
      teams.splice(existingIndex, 1);
    }
  } else if (action === "add") {
    teams.push({
      uid: teamUid,
      name: teamName,
      count: 1,
      hours: Math.round((durationMinutes / 60) * 10) / 10,
    });
  }
  
  return teams.sort((a, b) => b.count - a.count).slice(0, 20);
}

// ============================================
// Cascade Stats Update
// ============================================

export async function cascadeStatsUpdate(
  learning: LearningEntry,
  employeeUid: string,
  teamUid: string | undefined,
  action: "add" | "remove",
  employeeName?: string,
  teamName?: string
): Promise<{
  employee: ParsedEmployeeStats;
  team: ParsedTeamStats | null;
  org: ParsedOrgStats;
}> {
  // Update all levels in parallel
  const [employeeStats, teamStats, orgStats] = await Promise.all([
    updateEmployeeStats(employeeUid, learning, action),
    teamUid ? updateTeamStats(teamUid, learning, action, employeeName) : Promise.resolve(null),
    updateOrgStats(learning, action, employeeName, teamName),
  ]);

  return {
    employee: employeeStats,
    team: teamStats,
    org: orgStats,
  };
}

// ============================================
// Parse Stats from Contentstack Entry
// ============================================

export function parseEmployeeStats(entry: EmployeeStatsEntry): ParsedEmployeeStats {
  const activityDates = parseJsonField<ActivityDateEntry[]>(entry.activity_dates, []);
  const totalMinutes = entry.total_minutes || 0;
  const totalLearnings = entry.total_learnings || 0;
  
  return {
    uid: entry.uid,
    employee_uid: entry.employee?.[0]?.uid || "",
    total_learnings: totalLearnings,
    total_minutes: totalMinutes,
    total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    current_streak: entry.current_streak || 0,
    longest_streak: entry.longest_streak || 0,
    last_learning_date: entry.last_learning_date || null,
    learnings_by_type: parseJsonField<Record<string, number>>(entry.learnings_by_type, {}),
    hours_by_type: parseJsonField<Record<string, number>>(entry.hours_by_type, {}),
    activity_dates: activityDates,
    avg_session_minutes: totalLearnings > 0 ? Math.round(totalMinutes / totalLearnings) : 0,
    computed_at: entry.computed_at || entry.updated_at,
  };
}

export function parseTeamStats(entry: TeamStatsEntry): ParsedTeamStats {
  const totalMinutes = entry.total_minutes || 0;
  
  return {
    uid: entry.uid,
    team_uid: entry.team?.[0]?.uid || "",
    total_learnings: entry.total_learnings || 0,
    total_minutes: totalMinutes,
    total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    active_learners: entry.active_learners || 0,
    learnings_by_type: parseJsonField<Record<string, number>>(entry.learnings_by_type, {}),
    hours_by_type: parseJsonField<Record<string, number>>(entry.hours_by_type, {}),
    activity_dates: parseJsonField<ActivityDateEntry[]>(entry.activity_dates, []),
    top_learners: parseJsonField<TopLearnerEntry[]>(entry.top_learners, []),
    computed_at: entry.computed_at || entry.updated_at,
  };
}

export function parseOrgStats(entry: OrgStatsEntry): ParsedOrgStats {
  const totalMinutes = entry.total_minutes || 0;
  
  return {
    uid: entry.uid,
    total_learnings: entry.total_learnings || 0,
    total_minutes: totalMinutes,
    total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    total_active_employees: entry.total_active_employees || 0,
    total_active_teams: entry.total_active_teams || 0,
    learnings_by_type: parseJsonField<Record<string, number>>(entry.learnings_by_type, {}),
    hours_by_type: parseJsonField<Record<string, number>>(entry.hours_by_type, {}),
    activity_dates: parseJsonField<ActivityDateEntry[]>(entry.activity_dates, []),
    top_teams: parseJsonField<TopTeamEntry[]>(entry.top_teams, []),
    top_learners: parseJsonField<TopLearnerEntry[]>(entry.top_learners, []),
    computed_at: entry.computed_at || entry.updated_at,
  };
}

// ============================================
// Get Parsed Stats (for API responses)
// ============================================

export async function getEmployeeStatsParsed(employeeUid: string): Promise<ParsedEmployeeStats | null> {
  const entry = await getEmployeeStatsEntry(employeeUid);
  if (!entry) return null;
  return parseEmployeeStats(entry);
}

export async function getTeamStatsParsed(teamUid: string): Promise<ParsedTeamStats | null> {
  const entry = await getTeamStatsEntry(teamUid);
  if (!entry) return null;
  return parseTeamStats(entry);
}

export async function getOrgStatsParsed(): Promise<ParsedOrgStats | null> {
  const entry = await getOrgStatsEntry();
  if (!entry) return null;
  return parseOrgStats(entry);
}

