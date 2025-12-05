import { getDeliveryClient, getManagementContentType, getLocale, getEnvironment } from "./client";
import { nanoid } from "nanoid";
import type {
  LearningTodo,
  LearningTodoEntryData,
  CreateLearningTodoInput,
  ContentstackReference,
  TodoStatus,
} from "./types";
import type { Entry as ManagementEntry } from "@contentstack/management/types/stack/contentType/entry";

const CONTENT_TYPE = "learning_todo";

/**
 * Get all todos for an employee
 */
export async function getTodosByEmployee(
  employeeUid: string,
  status?: TodoStatus
): Promise<LearningTodo[]> {
  const client = getDeliveryClient();

  try {
    // Reference fields need to be queried using referenceIn with a sub-query
    const employeeQuery = client.ContentType("employee").Query().where("uid", employeeUid);
    
    let query = client
      .ContentType(CONTENT_TYPE)
      .Query()
      .referenceIn("employee", employeeQuery);
    
    if (status) {
      query = query.where("status", status);
    }

    const result = await query.toJSON().find();

    return (result[0] || []) as LearningTodo[];
  } catch (error) {
    console.error("Error fetching todos:", error);
    return [];
  }
}

/**
 * Get a single todo by UID
 */
export async function getTodoByUid(uid: string): Promise<LearningTodo | null> {
  const client = getDeliveryClient();

  try {
    const entry = await client
      .ContentType(CONTENT_TYPE)
      .Entry(uid)
      .toJSON()
      .fetch();

    return entry as unknown as LearningTodo;
  } catch (error) {
    console.error("Error fetching todo:", error);
    return null;
  }
}

/**
 * Create a new todo for an employee
 */
export async function createTodo(
  input: CreateLearningTodoInput
): Promise<LearningTodo | null> {
  const contentType = getManagementContentType(CONTENT_TYPE);
  const locale = getLocale();

  const employeeRef: ContentstackReference = {
    uid: input.employee_uid,
    _content_type_uid: "employee",
  };

  const entryData: LearningTodoEntryData = {
    title: `todo_${nanoid(10)}`,
    topic: input.topic,
    reason: input.reason,
    type: input.type,
    resource_title: input.resource_title,
    resource_description: input.resource_description,
    resource_url: input.resource_url,
    resource_image_url: input.resource_image_url,
    estimated_minutes: input.estimated_minutes,
    status: "pending",
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
    } as LearningTodo;
  } catch (error) {
    console.error("Error creating todo:", error);
    return null;
  }
}

/**
 * Update todo status
 */
export async function updateTodoStatus(
  uid: string,
  status: TodoStatus
): Promise<LearningTodo | null> {
  const contentType = getManagementContentType(CONTENT_TYPE);
  const locale = getLocale();

  try {
    const entry: ManagementEntry = await contentType.entry(uid).fetch();

    // Update status
    Object.assign(entry, { status });

    const updatedEntry = await entry.update();

    // Publish the updated entry
    await updatedEntry.publish({
      publishDetails: {
        locales: [locale],
        environments: [getEnvironment()],
      },
    });

    // Fetch from Delivery API for the updated data
    const deliveryClient = getDeliveryClient();
    
    // Wait a bit for propagation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const fetchedEntry = await deliveryClient
      .ContentType(CONTENT_TYPE)
      .Entry(uid)
      .toJSON()
      .fetch();

    return fetchedEntry as unknown as LearningTodo;
  } catch (error) {
    console.error("Error updating todo status:", error);
    return null;
  }
}

/**
 * Delete a todo by UID
 */
export async function deleteTodo(uid: string): Promise<boolean> {
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
    console.error("Error deleting todo:", error);
    return false;
  }
}

