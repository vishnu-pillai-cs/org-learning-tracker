"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useSession } from "next-auth/react";
import { getSyncManager } from "./sync-manager";
import type {
  AppDataState,
  AppDataAction,
  AppDataContextValue,
  Suggestion,
  Todo,
  initialAppDataState,
} from "./types";
import type { LearningEntry, CreateLearningInput, EmployeeStats } from "@/lib/contentstack/types";

// Initial state
const defaultState: AppDataState = {
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

// Reducer
function appDataReducer(state: AppDataState, action: AppDataAction): AppDataState {
  switch (action.type) {
    // Employee
    case "SET_EMPLOYEE":
      return { ...state, employee: { ...state.employee, data: action.payload } };
    case "SET_EMPLOYEE_LOADING":
      return { ...state, employee: { ...state.employee, loading: action.payload } };
    case "SET_EMPLOYEE_ERROR":
      return { ...state, employee: { ...state.employee, error: action.payload } };

    // Suggestions
    case "SET_SUGGESTIONS":
      return { ...state, suggestions: { ...state.suggestions, data: action.payload } };
    case "ADD_SUGGESTIONS": {
      const existingIds = new Set(state.suggestions.data.map((s) => s.uid));
      const newSuggestions = action.payload.filter((s) => !existingIds.has(s.uid));
      return {
        ...state,
        suggestions: {
          ...state.suggestions,
          data: [...newSuggestions, ...state.suggestions.data],
        },
      };
    }
    case "REMOVE_SUGGESTION":
      return {
        ...state,
        suggestions: {
          ...state.suggestions,
          data: state.suggestions.data.filter((s) => s.uid !== action.payload),
        },
      };
    case "SET_SUGGESTIONS_LOADING":
      return { ...state, suggestions: { ...state.suggestions, loading: action.payload } };
    case "SET_SUGGESTIONS_ERROR":
      return { ...state, suggestions: { ...state.suggestions, error: action.payload } };
    case "SET_GENERATING":
      return { ...state, suggestions: { ...state.suggestions, isGenerating: action.payload } };
    case "SET_NEW_SUGGESTION_IDS":
      return { ...state, suggestions: { ...state.suggestions, newIds: action.payload } };
    case "CLEAR_NEW_SUGGESTION_IDS":
      return { ...state, suggestions: { ...state.suggestions, newIds: new Set() } };

    // Todos
    case "SET_TODOS":
      return { ...state, todos: { ...state.todos, data: action.payload } };
    case "ADD_TODO":
      return {
        ...state,
        todos: { ...state.todos, data: [action.payload, ...state.todos.data] },
      };
    case "UPDATE_TODO":
      return {
        ...state,
        todos: {
          ...state.todos,
          data: state.todos.data.map((t) =>
            t.uid === action.payload.uid ? action.payload : t
          ),
        },
      };
    case "REMOVE_TODO":
      return {
        ...state,
        todos: {
          ...state.todos,
          data: state.todos.data.filter((t) => t.uid !== action.payload),
        },
      };
    case "SET_TODOS_LOADING":
      return { ...state, todos: { ...state.todos, loading: action.payload } };
    case "SET_TODOS_ERROR":
      return { ...state, todos: { ...state.todos, error: action.payload } };

    // Learnings
    case "SET_LEARNINGS":
      return { ...state, learnings: { ...state.learnings, data: action.payload } };
    case "ADD_LEARNING":
      return {
        ...state,
        learnings: {
          ...state.learnings,
          data: [action.payload, ...state.learnings.data],
        },
      };
    case "SET_LEARNINGS_LOADING":
      return { ...state, learnings: { ...state.learnings, loading: action.payload } };
    case "SET_LEARNINGS_ERROR":
      return { ...state, learnings: { ...state.learnings, error: action.payload } };

    // Stats
    case "SET_STATS":
      return { ...state, stats: { ...state.stats, data: action.payload } };
    case "SET_STATS_LOADING":
      return { ...state, stats: { ...state.stats, loading: action.payload } };
    case "SET_STATS_ERROR":
      return { ...state, stats: { ...state.stats, error: action.payload } };
    case "OPTIMISTIC_STATS_INCREMENT": {
      if (!state.stats.data) return state;
      const { duration_minutes, type, date } = action.payload;
      const dateStr = date.split("T")[0];
      const hours = duration_minutes / 60;

      // Clone and update stats
      const newStats = { ...state.stats.data };
      newStats.total_learnings = (newStats.total_learnings || 0) + 1;
      newStats.total_hours = Math.round(((newStats.total_hours || 0) + hours) * 10) / 10;

      // Update learnings_by_type
      const byType = { ...(newStats.learnings_by_type || {}) };
      byType[type] = (byType[type] || 0) + 1;
      newStats.learnings_by_type = byType;

      // Update hours_by_type
      const hoursByType = { ...(newStats.hours_by_type || {}) };
      hoursByType[type] = Math.round(((hoursByType[type] || 0) + hours) * 10) / 10;
      newStats.hours_by_type = hoursByType;

      // Update learnings_by_date
      const byDate = [...(newStats.learnings_by_date || [])];
      const existingDateIndex = byDate.findIndex((d) => d.date === dateStr);
      if (existingDateIndex >= 0) {
        byDate[existingDateIndex] = {
          ...byDate[existingDateIndex],
          count: byDate[existingDateIndex].count + 1,
          hours: Math.round((byDate[existingDateIndex].hours + hours) * 10) / 10,
        };
      } else {
        byDate.push({ date: dateStr, count: 1, hours: Math.round(hours * 10) / 10 });
        byDate.sort((a, b) => a.date.localeCompare(b.date));
      }
      newStats.learnings_by_date = byDate;

      return { ...state, stats: { ...state.stats, data: newStats } };
    }
    case "OPTIMISTIC_STATS_ROLLBACK": {
      if (!state.stats.data) return state;
      const { duration_minutes, type, date } = action.payload;
      const dateStr = date.split("T")[0];
      const hours = duration_minutes / 60;

      // Clone and rollback stats
      const newStats = { ...state.stats.data };
      newStats.total_learnings = Math.max(0, (newStats.total_learnings || 0) - 1);
      newStats.total_hours = Math.max(0, Math.round(((newStats.total_hours || 0) - hours) * 10) / 10);

      // Rollback learnings_by_type
      const byType = { ...(newStats.learnings_by_type || {}) };
      byType[type] = Math.max(0, (byType[type] || 0) - 1);
      if (byType[type] === 0) delete byType[type];
      newStats.learnings_by_type = byType;

      // Rollback hours_by_type
      const hoursByType = { ...(newStats.hours_by_type || {}) };
      hoursByType[type] = Math.max(0, Math.round(((hoursByType[type] || 0) - hours) * 10) / 10);
      if (hoursByType[type] === 0) delete hoursByType[type];
      newStats.hours_by_type = hoursByType;

      // Rollback learnings_by_date
      const byDate = [...(newStats.learnings_by_date || [])];
      const existingDateIndex = byDate.findIndex((d) => d.date === dateStr);
      if (existingDateIndex >= 0) {
        const newCount = byDate[existingDateIndex].count - 1;
        if (newCount <= 0) {
          byDate.splice(existingDateIndex, 1);
        } else {
          byDate[existingDateIndex] = {
            ...byDate[existingDateIndex],
            count: newCount,
            hours: Math.max(0, Math.round((byDate[existingDateIndex].hours - hours) * 10) / 10),
          };
        }
      }
      newStats.learnings_by_date = byDate;

      return { ...state, stats: { ...state.stats, data: newStats } };
    }

    // Global
    case "SET_INITIALIZED":
      return { ...state, initialized: action.payload };
    case "RESET":
      return defaultState;

    default:
      return state;
  }
}

// Create context
const AppDataContext = createContext<AppDataContextValue | null>(null);

// Provider props
interface AppDataProviderProps {
  children: React.ReactNode;
}

// Provider component
export function AppDataProvider({ children }: AppDataProviderProps) {
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(appDataReducer, defaultState);
  const syncManager = getSyncManager();

  // Refs for polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialSuggestionsCountRef = useRef<number>(0);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    dispatch({ type: "SET_SUGGESTIONS_LOADING", payload: true });
    try {
      const data = await syncManager.fetch<{ suggestions: Suggestion[] }>("/api/suggestions");
      dispatch({ type: "SET_SUGGESTIONS", payload: data.suggestions || [] });
      dispatch({ type: "SET_SUGGESTIONS_ERROR", payload: null });
    } catch (error) {
      dispatch({
        type: "SET_SUGGESTIONS_ERROR",
        payload: error instanceof Error ? error.message : "Failed to fetch suggestions",
      });
    } finally {
      dispatch({ type: "SET_SUGGESTIONS_LOADING", payload: false });
    }
  }, [syncManager]);

  // Trigger suggestion generation with polling
  const triggerSuggestionGeneration = useCallback(async () => {
    dispatch({ type: "SET_GENERATING", payload: true });
    initialSuggestionsCountRef.current = state.suggestions.data.length;

    try {
      // Trigger the generation API
      await syncManager.fetch("/api/suggestions/generate", { method: "POST" });

      // Start polling for new suggestions
      let pollCount = 0;
      const maxPolls = 20;

      const poll = async () => {
        pollCount++;
        try {
          const data = await syncManager.fetch<{ suggestions: Suggestion[] }>("/api/suggestions");
          const fetchedSuggestions = data.suggestions || [];

          // Find new suggestions
          const currentIds = new Set(state.suggestions.data.map((s) => s.uid));
          const newSuggestions = fetchedSuggestions.filter((s) => !currentIds.has(s.uid));

          if (newSuggestions.length > 0) {
            dispatch({ type: "ADD_SUGGESTIONS", payload: newSuggestions });
            dispatch({
              type: "SET_NEW_SUGGESTION_IDS",
              payload: new Set(newSuggestions.map((s) => s.uid)),
            });

            // Clear highlights after 5 seconds
            setTimeout(() => dispatch({ type: "CLEAR_NEW_SUGGESTION_IDS" }), 5000);
          }

          // Check if done
          const totalNew = fetchedSuggestions.length - initialSuggestionsCountRef.current;
          if (totalNew >= 2 || pollCount >= maxPolls) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            dispatch({ type: "SET_GENERATING", payload: false });
          }
        } catch (error) {
          console.error("Polling error:", error);
        }

        // Safety timeout
        if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          dispatch({ type: "SET_GENERATING", payload: false });
        }
      };

      // Start polling
      pollIntervalRef.current = setInterval(poll, 3000);
      poll(); // Also poll immediately
    } catch (error) {
      console.error("Generation error:", error);
      dispatch({ type: "SET_GENERATING", payload: false });
    }
  }, [syncManager, state.suggestions.data]);

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    dispatch({ type: "SET_TODOS_LOADING", payload: true });
    try {
      const data = await syncManager.fetch<{ todos: Todo[] }>("/api/todos");
      dispatch({ type: "SET_TODOS", payload: data.todos || [] });
      dispatch({ type: "SET_TODOS_ERROR", payload: null });
    } catch (error) {
      dispatch({
        type: "SET_TODOS_ERROR",
        payload: error instanceof Error ? error.message : "Failed to fetch todos",
      });
    } finally {
      dispatch({ type: "SET_TODOS_LOADING", payload: false });
    }
  }, [syncManager]);

  // Add suggestion to todos
  const addSuggestionToTodo = useCallback(
    async (suggestion: Suggestion): Promise<Todo | null> => {
      try {
        const data = await syncManager.fetch<{ todo: Todo }>("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: suggestion.topic,
            reason: suggestion.reason,
            type: suggestion.type,
            resource_title: suggestion.resource.title,
            resource_description: suggestion.resource.description,
            resource_url: suggestion.resource.url,
            resource_image_url: suggestion.resource.imageUrl,
            estimated_minutes: suggestion.estimated_minutes,
            suggestion_uid: suggestion.uid,
          }),
        });

        if (data.todo) {
          dispatch({ type: "ADD_TODO", payload: data.todo });
          dispatch({ type: "REMOVE_SUGGESTION", payload: suggestion.uid });
          return data.todo;
        }
        return null;
      } catch (error) {
        console.error("Failed to add suggestion to todos:", error);
        return null;
      }
    },
    [syncManager]
  );

  // Complete todo (returns the todo data for pre-filling learning form)
  const completeTodo = useCallback(
    (uid: string): Todo | null => {
      const todo = state.todos.data.find((t) => t.uid === uid);
      if (todo) {
        // Remove from UI immediately
        dispatch({ type: "REMOVE_TODO", payload: uid });
      }
      return todo || null;
    },
    [state.todos.data]
  );

  // Remove todo
  const removeTodo = useCallback(
    async (uid: string): Promise<boolean> => {
      try {
        await syncManager.fetch(`/api/todos/${uid}`, { method: "DELETE" });
        dispatch({ type: "REMOVE_TODO", payload: uid });
        return true;
      } catch (error) {
        console.error("Failed to remove todo:", error);
        return false;
      }
    },
    [syncManager]
  );

  // Fetch learnings
  const fetchLearnings = useCallback(
    async (options?: { limit?: number }) => {
      dispatch({ type: "SET_LEARNINGS_LOADING", payload: true });
      try {
        const params = new URLSearchParams({ scope: "me" });
        if (options?.limit) {
          params.set("limit", options.limit.toString());
        }
        const data = await syncManager.fetch<{ learnings: LearningEntry[] }>(
          `/api/learnings?${params.toString()}`
        );
        dispatch({ type: "SET_LEARNINGS", payload: data.learnings || [] });
        dispatch({ type: "SET_LEARNINGS_ERROR", payload: null });
      } catch (error) {
        dispatch({
          type: "SET_LEARNINGS_ERROR",
          payload: error instanceof Error ? error.message : "Failed to fetch learnings",
        });
      } finally {
        dispatch({ type: "SET_LEARNINGS_LOADING", payload: false });
      }
    },
    [syncManager]
  );

  // Add learning with optimistic stats update
  const addLearning = useCallback(
    async (data: CreateLearningInput): Promise<LearningEntry | null> => {
      // Optimistic update for immediate UI feedback
      const optimisticPayload = {
        duration_minutes: data.duration_minutes || 0,
        type: data.type,
        date: data.date,
      };
      dispatch({ type: "OPTIMISTIC_STATS_INCREMENT", payload: optimisticPayload });

      try {
        const response = await syncManager.fetch<{ learning: LearningEntry; stats: EmployeeStats }>(
          "/api/learnings",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );

        if (response.learning) {
          dispatch({ type: "ADD_LEARNING", payload: response.learning });

          // Replace optimistic stats with server stats if returned
          if (response.stats) {
            dispatch({ type: "SET_STATS", payload: response.stats });
          }

          return response.learning;
        }
        return null;
      } catch (error) {
        // Rollback optimistic update on error
        dispatch({ type: "OPTIMISTIC_STATS_ROLLBACK", payload: optimisticPayload });
        console.error("Failed to add learning:", error);
        throw error;
      }
    },
    [syncManager]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    dispatch({ type: "SET_STATS_LOADING", payload: true });
    try {
      const data = await syncManager.fetch<{ stats: EmployeeStats }>("/api/stats/me");
      dispatch({ type: "SET_STATS", payload: data.stats || null });
      dispatch({ type: "SET_STATS_ERROR", payload: null });
    } catch (error) {
      dispatch({
        type: "SET_STATS_ERROR",
        payload: error instanceof Error ? error.message : "Failed to fetch stats",
      });
    } finally {
      dispatch({ type: "SET_STATS_LOADING", payload: false });
    }
  }, [syncManager]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSuggestions(), fetchTodos(), fetchLearnings({ limit: 5 }), fetchStats()]);
  }, [fetchSuggestions, fetchTodos, fetchLearnings, fetchStats]);

  // Initialize (called once when authenticated)
  const initialize = useCallback(async () => {
    if (state.initialized) return;
    dispatch({ type: "SET_INITIALIZED", payload: true });
    await refreshAll();
  }, [state.initialized, refreshAll]);

  // Auto-initialize when session is ready
  useEffect(() => {
    if (status === "authenticated" && session?.user && !state.initialized) {
      initialize();
    }
  }, [status, session, state.initialized, initialize]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      syncManager.stopAllPolling();
    };
  }, [syncManager]);

  const value: AppDataContextValue = {
    state,
    fetchSuggestions,
    triggerSuggestionGeneration,
    fetchTodos,
    addSuggestionToTodo,
    completeTodo,
    removeTodo,
    fetchLearnings,
    addLearning,
    fetchStats,
    refreshAll,
    initialize,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// Hook to use the context
export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}

