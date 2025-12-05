import { getDeliveryClient, getStack, getLocale } from "./client";
import { nanoid } from "nanoid";
import type {
  LearningTodo,
  LearningTodoEntryData,
  CreateLearningTodoInput,
  ContentstackReference,
  TodoStatus,
} from "./types";

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
  const stack = getStack();
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
    const entry = await stack
      .contentType(CONTENT_TYPE)
      .entry()
      .create({ entry: entryData as unknown as Record<string, unknown> });

    // Publish the entry
    await entry.publish({
      publishDetails: {
        locales: [locale],
        environments: [process.env.CONTENTSTACK_ENVIRONMENT || "development"],
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
  const stack = getStack();
  const locale = getLocale();

  try {
    const entryClient = stack
      .contentType(CONTENT_TYPE)
      .entry(uid);

    // Fetch current entry
    const currentEntry = await entryClient.fetch();

    // Update status
    const updatedData = {
      ...currentEntry,
      status,
    };

    const updatedEntry = await entryClient.update({ entry: updatedData as unknown as Record<string, unknown> });

    // Publish the updated entry
    await updatedEntry.publish({
      publishDetails: {
        locales: [locale],
        environments: [process.env.CONTENTSTACK_ENVIRONMENT || "development"],
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
  const stack = getStack();
  const locale = getLocale();

  try {
    const entry = stack.contentType(CONTENT_TYPE).entry(uid);
    
    // Unpublish first (required before deletion)
    try {
      await entry.unpublish({
        publishDetails: {
          locales: [locale],
          environments: [process.env.CONTENTSTACK_ENVIRONMENT || "development"],
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

