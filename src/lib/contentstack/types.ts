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
  title: string;
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
export interface EmployeeStats {
  total_learnings: number;
  total_hours: number;
  learnings_by_type: Record<LearningType, number>;
  top_tags: { tag: string; count: number }[];
  recent_learnings: LearningEntry[];
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

