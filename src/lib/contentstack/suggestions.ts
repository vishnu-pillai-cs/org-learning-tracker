import { getDeliveryClient, getManagementContentType, getLocale, getEnvironment } from "./client";
import { nanoid } from "nanoid";
import type {
  LearningSuggestion,
  LearningSuggestionEntryData,
  CreateLearningSuggestionInput,
  ContentstackReference,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";

const CONTENT_TYPE = "learning_suggestion";

/**
 * Get all suggestions for an employee
 */
export async function getSuggestionsByEmployee(
  employeeUid: string
): Promise<LearningSuggestion[]> {
  const client = getDeliveryClient();

  try {
    // Reference fields need to be queried using referenceIn with a sub-query
    const employeeQuery = client.ContentType("employee").Query().where("uid", employeeUid);
    
    const result = await client
      .ContentType(CONTENT_TYPE)
      .Query()
      .referenceIn("employee", employeeQuery)
      .toJSON()
      .find();

    return (result[0] || []) as LearningSuggestion[];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

/**
 * Create a new suggestion for an employee
 */
export async function createSuggestion(
  input: CreateLearningSuggestionInput
): Promise<LearningSuggestion | null> {
  const contentType = getManagementContentType(CONTENT_TYPE);
  const locale = getLocale();

  const employeeRef: ContentstackReference = {
    uid: input.employee_uid,
    _content_type_uid: "employee",
  };

  const entryData: LearningSuggestionEntryData = {
    title: `suggestion_${nanoid(10)}`,
    topic: input.topic,
    reason: input.reason,
    type: input.type,
    resource_title: input.resource_title,
    resource_description: input.resource_description,
    resource_url: input.resource_url,
    resource_image_url: input.resource_image_url,
    estimated_minutes: input.estimated_minutes,
    employee: [employeeRef],
  };

  try {
    const entry: ManagementEntry = await contentType.entry().create({ entry: entryData });

    // Publish the entry
    await entry.publish({
      publishDetails: {
        locales: [locale],
        environments: [getEnvironment()],
      },
    });

    return {
      ...entryData,
      uid: entry.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "",
      updated_by: "",
      _version: 1,
      locale,
    } as LearningSuggestion;
  } catch (error) {
    console.error("Error creating suggestion:", error);
    return null;
  }
}

/**
 * Delete all suggestions for an employee
 */
export async function deleteSuggestionsByEmployee(
  employeeUid: string
): Promise<boolean> {
  try {
    // First get all suggestions for this employee
    const suggestions = await getSuggestionsByEmployee(employeeUid);

    // Delete each suggestion using the single delete function
    for (const suggestion of suggestions) {
      await deleteSuggestion(suggestion.uid);
    }

    return true;
  } catch (error) {
    console.error("Error deleting suggestions:", error);
    return false;
  }
}

/**
 * Delete a single suggestion by UID
 */
export async function deleteSuggestion(uid: string): Promise<boolean> {
  const contentType = getManagementContentType(CONTENT_TYPE);
  const locale = getLocale();

  try {
    const entry: ManagementEntry = await contentType.entry(uid).fetch();
    
    // Unpublish first (required before deletion)
    try {
      await entry.unpublish({
        publishDetails: {
          locales: [locale],
          environments: [getEnvironment()],
        },
      });
    } catch (unpublishError) {
      // Entry might already be unpublished, continue to delete
      console.log("Unpublish warning (may be already unpublished):", unpublishError);
    }
    
    // Then delete
    await entry.delete();

    return true;
  } catch (error) {
    console.error("Error deleting suggestion:", error);
    return false;
  }
}

