import Contentstack, { Query } from "contentstack";
import * as contentstack from "@contentstack/management";
import type { Stack as ManagementStack } from "@contentstack/management/types/stack";
import type { ContentType as ManagementContentType } from "@contentstack/management/types/stack/contentType";
import type { Entry as ManagementEntry, Entries as ManagementEntries, EntryData } from "@contentstack/management/types/stack/contentType/entry";

// Re-export types for use in other files
export type { Query, ManagementStack, ManagementContentType, ManagementEntry, ManagementEntries, EntryData };

// Environment validation
const requiredEnvVars = [
  "CONTENTSTACK_API_KEY",
  "CONTENTSTACK_DELIVERY_TOKEN",
  "CONTENTSTACK_MANAGEMENT_TOKEN",
  "CONTENTSTACK_ENVIRONMENT",
] as const;

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Delivery SDK (for reading published content)
let deliveryClient: Contentstack.Stack | null = null;

export function getDeliveryClient(): Contentstack.Stack {
  if (!deliveryClient) {
    validateEnv();
    deliveryClient = Contentstack.Stack({
      api_key: process.env.CONTENTSTACK_API_KEY!,
      delivery_token: process.env.CONTENTSTACK_DELIVERY_TOKEN!,
      environment: process.env.CONTENTSTACK_ENVIRONMENT!,
    });
  }
  return deliveryClient;
}

// Management SDK client
let managementClient: contentstack.ContentstackClient | null = null;

export function getManagementClient(): contentstack.ContentstackClient {
  if (!managementClient) {
    validateEnv();
    managementClient = contentstack.client();
  }
  return managementClient;
}

// Get stack reference for management operations
export function getStack(): ManagementStack {
  const client = getManagementClient();
  return client.stack({
    api_key: process.env.CONTENTSTACK_API_KEY!,
    management_token: process.env.CONTENTSTACK_MANAGEMENT_TOKEN!,
  });
}

// Content type UIDs
export const CONTENT_TYPES = {
  EMPLOYEE: "employee",
  TEAM: "team",
  LEARNING_ENTRY: "learning_entry",
  INVITATION: "invitation",
} as const;

// Helper to get environment name
export function getEnvironment(): string {
  return process.env.CONTENTSTACK_ENVIRONMENT!;
}

// Helper to get a query for a content type
// Returns Query which is the base type for all query operations
export function getContentTypeQuery(contentTypeUid: string): Query {
  return getDeliveryClient().ContentType(contentTypeUid).Query();
}

// Helper to get management content type
export function getManagementContentType(contentTypeUid: string): ManagementContentType {
  return getStack().contentType(contentTypeUid);
}
