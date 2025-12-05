// Context types for AppData store

import type {
  Employee,
  LearningEntry,
  EmployeeStats,
  LearningType,
  TodoStatus,
  CreateLearningInput,
} from "@/lib/contentstack/types";

// Frontend-friendly types (transformed from API responses)
export interface SuggestionResource {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
}

export interface Suggestion {
  uid: string;
  topic: string;
  reason: string;
  type: LearningType;
  estimated_minutes?: number;
  created_at?: string;
  resource: SuggestionResource;
}

export interface Todo {
  uid: string;
  topic: string;
  reason: string;
  type: LearningType;
  estimated_minutes?: number;
  status: TodoStatus;
  resource: SuggestionResource;
}

// State slices
export interface EmployeeState {
  data: Employee | null;
  loading: boolean;
  error: string | null;
}

export interface SuggestionsState {
  data: Suggestion[];
  loading: boolean;
  error: string | null;
  isGenerating: boolean;
  newIds: Set<string>;
}

export interface TodosState {
  data: Todo[];
  loading: boolean;
  error: string | null;
}

export interface LearningsState {
  data: LearningEntry[];
  loading: boolean;
  error: string | null;
}

export interface StatsState {
  data: EmployeeStats | null;
  loading: boolean;
  error: string | null;
}

// Combined app state
export interface AppDataState {
  employee: EmployeeState;
  suggestions: SuggestionsState;
  todos: TodosState;
  learnings: LearningsState;
  stats: StatsState;
  initialized: boolean;
}

// Optimistic update payload for stats
export interface OptimisticStatsPayload {
  duration_minutes: number;
  type: LearningType;
  date: string;
}

// Action types for state updates
export type AppDataAction =
  // Employee
  | { type: "SET_EMPLOYEE"; payload: Employee | null }
  | { type: "SET_EMPLOYEE_LOADING"; payload: boolean }
  | { type: "SET_EMPLOYEE_ERROR"; payload: string | null }
  // Suggestions
  | { type: "SET_SUGGESTIONS"; payload: Suggestion[] }
  | { type: "ADD_SUGGESTIONS"; payload: Suggestion[] }
  | { type: "REMOVE_SUGGESTION"; payload: string }
  | { type: "SET_SUGGESTIONS_LOADING"; payload: boolean }
  | { type: "SET_SUGGESTIONS_ERROR"; payload: string | null }
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "SET_NEW_SUGGESTION_IDS"; payload: Set<string> }
  | { type: "CLEAR_NEW_SUGGESTION_IDS" }
  // Todos
  | { type: "SET_TODOS"; payload: Todo[] }
  | { type: "ADD_TODO"; payload: Todo }
  | { type: "UPDATE_TODO"; payload: Todo }
  | { type: "REMOVE_TODO"; payload: string }
  | { type: "SET_TODOS_LOADING"; payload: boolean }
  | { type: "SET_TODOS_ERROR"; payload: string | null }
  // Learnings
  | { type: "SET_LEARNINGS"; payload: LearningEntry[] }
  | { type: "ADD_LEARNING"; payload: LearningEntry }
  | { type: "SET_LEARNINGS_LOADING"; payload: boolean }
  | { type: "SET_LEARNINGS_ERROR"; payload: string | null }
  // Stats
  | { type: "SET_STATS"; payload: EmployeeStats | null }
  | { type: "SET_STATS_LOADING"; payload: boolean }
  | { type: "SET_STATS_ERROR"; payload: string | null }
  | { type: "OPTIMISTIC_STATS_INCREMENT"; payload: OptimisticStatsPayload }
  | { type: "OPTIMISTIC_STATS_ROLLBACK"; payload: OptimisticStatsPayload }
  // Global
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "RESET" };

// Context actions (methods)
export interface AppDataActions {
  // Suggestions
  fetchSuggestions: () => Promise<void>;
  triggerSuggestionGeneration: () => Promise<void>;

  // Todos
  fetchTodos: () => Promise<void>;
  addSuggestionToTodo: (suggestion: Suggestion) => Promise<Todo | null>;
  completeTodo: (uid: string) => Todo | null;
  removeTodo: (uid: string) => Promise<boolean>;

  // Learnings
  fetchLearnings: (options?: { limit?: number }) => Promise<void>;
  addLearning: (data: CreateLearningInput) => Promise<LearningEntry | null>;

  // Stats
  fetchStats: () => Promise<void>;

  // Utility
  refreshAll: () => Promise<void>;
  initialize: () => Promise<void>;
}

// Full context value
export interface AppDataContextValue extends AppDataActions {
  state: AppDataState;
}

// Initial state
export const initialAppDataState: AppDataState = {
  employee: {
    data: null,
    loading: false,
    error: null,
  },
  suggestions: {
    data: [],
    loading: false,
    error: null,
    isGenerating: false,
    newIds: new Set(),
  },
  todos: {
    data: [],
    loading: false,
    error: null,
  },
  learnings: {
    data: [],
    loading: false,
    error: null,
  },
  stats: {
    data: null,
    loading: false,
    error: null,
  },
  initialized: false,
};

