"use client";

import { useCallback, useMemo } from "react";
import { useAppData } from "./app-data-context";
import type { Suggestion, Todo } from "./types";
import type { CreateLearningInput } from "@/lib/contentstack/types";

/**
 * Hook for suggestions state and actions
 */
export function useSuggestions() {
  const { state, fetchSuggestions, triggerSuggestionGeneration, addSuggestionToTodo } =
    useAppData();

  const suggestions = state.suggestions.data;
  const loading = state.suggestions.loading;
  const error = state.suggestions.error;
  const isGenerating = state.suggestions.isGenerating;
  const newIds = state.suggestions.newIds;

  // Check if a suggestion is newly added (for animation)
  const isNewSuggestion = useCallback(
    (uid: string) => newIds.has(uid),
    [newIds]
  );

  return {
    suggestions,
    loading,
    error,
    isGenerating,
    newIds,
    isNewSuggestion,
    fetch: fetchSuggestions,
    triggerGeneration: triggerSuggestionGeneration,
    addToTodo: addSuggestionToTodo,
  };
}

/**
 * Hook for todos state and actions
 */
export function useTodos() {
  const { state, fetchTodos, completeTodo, removeTodo } = useAppData();

  const todos = state.todos.data;
  const loading = state.todos.loading;
  const error = state.todos.error;

  // Filter to get only pending todos
  const pendingTodos = useMemo(
    () => todos.filter((t) => t.status === "pending"),
    [todos]
  );

  // Filter to get completed todos
  const completedTodos = useMemo(
    () => todos.filter((t) => t.status === "completed"),
    [todos]
  );

  return {
    todos,
    pendingTodos,
    completedTodos,
    loading,
    error,
    fetch: fetchTodos,
    complete: completeTodo,
    remove: removeTodo,
  };
}

/**
 * Hook for learnings state and actions
 */
export function useLearnings() {
  const { state, fetchLearnings, addLearning, triggerSuggestionGeneration } = useAppData();

  const learnings = state.learnings.data;
  const loading = state.learnings.loading;
  const error = state.learnings.error;

  // Add learning and trigger suggestion generation
  const addLearningWithSuggestions = useCallback(
    async (data: CreateLearningInput) => {
      const learning = await addLearning(data);
      if (learning) {
        // Trigger suggestion generation in the background
        triggerSuggestionGeneration();
      }
      return learning;
    },
    [addLearning, triggerSuggestionGeneration]
  );

  return {
    learnings,
    loading,
    error,
    fetch: fetchLearnings,
    add: addLearning,
    addWithSuggestions: addLearningWithSuggestions,
  };
}

/**
 * Hook for stats state and actions
 */
export function useStats() {
  const { state, fetchStats } = useAppData();

  const stats = state.stats.data;
  const loading = state.stats.loading;
  const error = state.stats.error;

  return {
    stats,
    loading,
    error,
    fetch: fetchStats,
  };
}

/**
 * Hook for employee state
 */
export function useEmployee() {
  const { state } = useAppData();

  const employee = state.employee.data;
  const loading = state.employee.loading;
  const error = state.employee.error;

  return {
    employee,
    loading,
    error,
  };
}

/**
 * Hook for checking if app data is initialized
 */
export function useAppDataInitialized() {
  const { state, initialize, refreshAll } = useAppData();

  return {
    initialized: state.initialized,
    initialize,
    refreshAll,
  };
}

