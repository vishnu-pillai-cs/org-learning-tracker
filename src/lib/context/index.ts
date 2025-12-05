// Barrel export for context
export { AppDataProvider, useAppData } from "./app-data-context";
export {
  useSuggestions,
  useTodos,
  useLearnings,
  useStats,
  useEmployee,
  useAppDataInitialized,
} from "./hooks";
export { getSyncManager } from "./sync-manager";
export type {
  AppDataState,
  AppDataAction,
  AppDataActions,
  AppDataContextValue,
  Suggestion,
  Todo,
  SuggestionResource,
} from "./types";

