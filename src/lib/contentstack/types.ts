// Contentstack Content Type Interfaces
import type { EntryData } from "@contentstack/management/types/stack/contentType/entry";

export type EmployeeRole = "employee" | "manager" | "org_admin";
export type EmployeeStatus = "active" | "inactive" | "invited";
export type TeamStatus = "active" | "archived";
export type LearningType = "course" | "article" | "video" | "project" | "other";
export type LearningVisibility = "team" | "org" | "private";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

// Base Contentstack entry fields
export interface ContentstackEntry {
  uid: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  _version: number;
  locale: string;
}

// Reference type for Contentstack references
export interface ContentstackReference {
  uid: string;
  _content_type_uid: string;
}

// Employee Content Type
export interface Employee extends ContentstackEntry {
  title: string; // Contentstack requires a title field
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  manager?: ContentstackReference[];
  team?: ContentstackReference[];
}

// Team Content Type
export interface Team extends ContentstackEntry {
  title: string;
  name: string;
  description?: string;
  manager: ContentstackReference[];
  status: TeamStatus;
}

// Learning Entry Content Type
export interface LearningEntry extends ContentstackEntry {
  title: string; // Auto-generated unique ID
  name: string; // User-facing learning title
  description?: string;
  type: LearningType;
  source_url?: string;
  date: string;
  duration_minutes?: number;
  tags?: string[];
  employee: ContentstackReference[];
  team?: ContentstackReference[];
  visibility: LearningVisibility;
}

// Invitation Content Type
export interface Invitation extends ContentstackEntry {
  title: string;
  email: string;
  name?: string;
  token: string;
  role: Exclude<EmployeeRole, "org_admin">; // Only employee or manager can be invited
  team?: ContentstackReference[];
  invited_by: ContentstackReference[];
  status: InvitationStatus;
  expires_at: string;
}

// Populated types (with resolved references)
export interface EmployeePopulated extends Omit<Employee, "manager" | "team"> {
  manager?: Employee;
  team?: Team;
}

export interface TeamPopulated extends Omit<Team, "manager"> {
  manager: Employee;
  members?: Employee[];
}

export interface LearningEntryPopulated extends Omit<LearningEntry, "employee" | "team"> {
  employee: Employee;
  team?: Team;
}

export interface InvitationPopulated extends Omit<Invitation, "team" | "invited_by"> {
  team?: Team;
  invited_by: Employee;
}

// API Request/Response types
export interface CreateEmployeeInput {
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  manager_uid?: string;
  team_uid?: string;
}

export interface UpdateEmployeeInput {
  name?: string;
  avatar_url?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  manager_uid?: string | null;
  team_uid?: string | null;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  manager_uid: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  manager_uid?: string;
  status?: TeamStatus;
}

export interface CreateLearningInput {
  title: string;
  description?: string;
  type: LearningType;
  source_url?: string;
  date: string;
  duration_minutes?: number;
  tags?: string[];
  visibility?: LearningVisibility;
}

export interface UpdateLearningInput {
  title?: string;
  description?: string;
  type?: LearningType;
  source_url?: string;
  date?: string;
  duration_minutes?: number;
  tags?: string[];
  visibility?: LearningVisibility;
}

export interface CreateInvitationInput {
  email: string;
  name?: string;
  role: Exclude<EmployeeRole, "org_admin">;
  team_uid?: string;
}

// Query filter types
export interface LearningFilters {
  employee_uid?: string;
  team_uid?: string;
  type?: LearningType;
  visibility?: LearningVisibility;
  from_date?: string;
  to_date?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
}

export interface EmployeeFilters {
  role?: EmployeeRole;
  status?: EmployeeStatus;
  team_uid?: string;
  manager_uid?: string;
  limit?: number;
  skip?: number;
}

// Stats types
export interface LearningsByDate {
  date: string;
  count: number;
  hours: number;
}

export interface EmployeeStats {
  total_learnings: number;
  total_hours: number;
  learnings_by_type: Record<LearningType, number>;
  hours_by_type: Record<LearningType, number>;
  top_tags: { tag: string; count: number }[];
  recent_learnings: LearningEntry[];
  learnings_by_date: LearningsByDate[];
  current_streak: number;
  longest_streak: number;
  avg_session_minutes: number;
}

export interface TeamStats extends EmployeeStats {
  member_count: number;
  learnings_by_employee: { employee: Employee; count: number; hours: number }[];
}

export interface OrgStats extends TeamStats {
  team_count: number;
  learnings_by_team: { team: Team; count: number; hours: number }[];
}

// Management SDK Entry Data Types (for creating/updating entries)
// These extend EntryData which requires a 'title' field

export interface EmployeeEntryData extends EntryData {
  google_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  manager?: ContentstackReference[];
  team?: ContentstackReference[];
}

export interface TeamEntryData extends EntryData {
  name: string;
  description?: string;
  manager: ContentstackReference[];
  status: TeamStatus;
}

export interface LearningEntryData extends EntryData {
  name: string; // User-facing learning title
  description?: string;
  type: LearningType;
  source_url?: string;
  date: string;
  duration_minutes?: number;
  tags?: string[];
  employee: ContentstackReference[];
  team?: ContentstackReference[];
  visibility: LearningVisibility;
}

export interface InvitationEntryData extends EntryData {
  email: string;
  name?: string;
  token: string;
  role: Exclude<EmployeeRole, "org_admin">;
  team?: ContentstackReference[];
  invited_by: ContentstackReference[];
  status: InvitationStatus;
  expires_at: string;
}

// Learning Suggestion Content Type
export interface LearningSuggestion extends ContentstackEntry {
  title: string; // Unique identifier
  topic: string;
  reason: string;
  type: LearningType; // course, article, video, project, other
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  employee: ContentstackReference[];
}

// Learning Todo Content Type
export type TodoStatus = "pending" | "completed";

export interface LearningTodo extends ContentstackEntry {
  title: string; // Unique identifier
  topic: string;
  reason: string;
  type: LearningType; // course, article, video, project, other
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  status: TodoStatus;
  employee: ContentstackReference[];
}

// Entry Data types for Management SDK
export interface LearningSuggestionEntryData extends EntryData {
  topic: string;
  reason: string;
  type: LearningType;
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  employee: ContentstackReference[];
}

export interface LearningTodoEntryData extends EntryData {
  topic: string;
  reason: string;
  type: LearningType;
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  status: TodoStatus;
  employee: ContentstackReference[];
}

// Input types for creating suggestions and todos
export interface CreateLearningSuggestionInput {
  topic: string;
  reason: string;
  type: LearningType;
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  employee_uid: string;
}

export interface CreateLearningTodoInput {
  topic: string;
  reason: string;
  type: LearningType;
  resource_title?: string;
  resource_description?: string;
  resource_url?: string;
  resource_image_url?: string;
  estimated_minutes?: number;
  employee_uid: string;
}

// ============================================
// Pre-computed Stats Content Types
// ============================================

// Activity date entry for time-series data
export interface ActivityDateEntry {
  date: string;
  count: number;
  minutes: number;
}

// Top learner entry for leaderboards
export interface TopLearnerEntry {
  uid: string;
  name: string;
  count: number;
  hours: number;
}

// Top team entry for org leaderboards
export interface TopTeamEntry {
  uid: string;
  name: string;
  count: number;
  hours: number;
}

// Employee Stats Content Type (stored in Contentstack)
export interface EmployeeStatsEntry extends ContentstackEntry {
  title: string; // "stats-{employee_uid}"
  employee: ContentstackReference[];
  total_learnings: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_learning_date: string; // ISO date string
  learnings_by_type: string; // JSON string: Record<LearningType, number>
  hours_by_type: string; // JSON string: Record<LearningType, number>
  activity_dates: string; // JSON string: ActivityDateEntry[] (last 90 days)
  computed_at: string; // ISO timestamp
}

// Team Stats Content Type (stored in Contentstack)
export interface TeamStatsEntry extends ContentstackEntry {
  title: string; // "stats-{team_uid}"
  team: ContentstackReference[];
  total_learnings: number;
  total_minutes: number;
  active_learners: number; // Employees with activity this period
  learnings_by_type: string; // JSON string
  hours_by_type: string; // JSON string
  activity_dates: string; // JSON string: ActivityDateEntry[]
  top_learners: string; // JSON string: TopLearnerEntry[]
  computed_at: string;
}

// Org Stats Content Type (stored in Contentstack)
export interface OrgStatsEntry extends ContentstackEntry {
  title: string; // "org-stats"
  total_learnings: number;
  total_minutes: number;
  total_active_employees: number;
  total_active_teams: number;
  learnings_by_type: string; // JSON string
  hours_by_type: string; // JSON string
  activity_dates: string; // JSON string: ActivityDateEntry[]
  top_teams: string; // JSON string: TopTeamEntry[]
  top_learners: string; // JSON string: TopLearnerEntry[]
  computed_at: string;
}

// Entry Data types for Management SDK (creating/updating stats)
export interface EmployeeStatsEntryData extends EntryData {
  employee: ContentstackReference[];
  total_learnings: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_learning_date: string;
  learnings_by_type: string;
  hours_by_type: string;
  activity_dates: string;
  computed_at: string;
}

export interface TeamStatsEntryData extends EntryData {
  team: ContentstackReference[];
  total_learnings: number;
  total_minutes: number;
  active_learners: number;
  learnings_by_type: string;
  hours_by_type: string;
  activity_dates: string;
  top_learners: string;
  computed_at: string;
}

export interface OrgStatsEntryData extends EntryData {
  total_learnings: number;
  total_minutes: number;
  total_active_employees: number;
  total_active_teams: number;
  learnings_by_type: string;
  hours_by_type: string;
  activity_dates: string;
  top_teams: string;
  top_learners: string;
  computed_at: string;
}

// Parsed stats types (after JSON parsing, for use in application)
export interface ParsedEmployeeStats {
  uid: string;
  employee_uid: string;
  total_learnings: number;
  total_minutes: number;
  total_hours: number;
  current_streak: number;
  longest_streak: number;
  last_learning_date: string | null;
  learnings_by_type: Record<string, number>;
  hours_by_type: Record<string, number>;
  activity_dates: ActivityDateEntry[];
  avg_session_minutes: number;
  computed_at: string;
}

export interface ParsedTeamStats {
  uid: string;
  team_uid: string;
  total_learnings: number;
  total_minutes: number;
  total_hours: number;
  active_learners: number;
  learnings_by_type: Record<string, number>;
  hours_by_type: Record<string, number>;
  activity_dates: ActivityDateEntry[];
  top_learners: TopLearnerEntry[];
  computed_at: string;
}

export interface ParsedOrgStats {
  uid: string;
  total_learnings: number;
  total_minutes: number;
  total_hours: number;
  total_active_employees: number;
  total_active_teams: number;
  learnings_by_type: Record<string, number>;
  hours_by_type: Record<string, number>;
  activity_dates: ActivityDateEntry[];
  top_teams: TopTeamEntry[];
  top_learners: TopLearnerEntry[];
  computed_at: string;
}

