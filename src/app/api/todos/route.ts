import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeByEmail } from "@/lib/contentstack/employees";
import { getTodosByEmployee, createTodo } from "@/lib/contentstack/todos";
import { deleteSuggestion } from "@/lib/contentstack/suggestions";

// GET - Fetch user's todos
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await getEmployeeByEmail(session.user.email);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const todos = await getTodosByEmployee(employee.uid);

    // Transform to frontend format (sorted by created_at, most recent first)
    const formattedTodos = todos
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((t) => ({
        uid: t.uid,
        topic: t.topic,
        reason: t.reason,
        type: t.type || "other",
        estimated_minutes: t.estimated_minutes,
        status: t.status,
        resource: {
          title: t.resource_title || t.topic,
          description: t.resource_description || t.reason,
          url: t.resource_url || "",
          imageUrl: t.resource_image_url || null,
        },
      }));

    return NextResponse.json({ todos: formattedTodos });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST - Add a suggestion to todos
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await getEmployeeByEmail(session.user.email);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      topic,
      reason,
      type = "other",
      resource_title,
      resource_description,
      resource_url,
      resource_image_url,
      estimated_minutes,
      suggestion_uid, // Optional: if coming from a suggestion, we can delete it
    } = body;

    if (!topic || !reason) {
      return NextResponse.json(
        { error: "Topic and reason are required" },
        { status: 400 }
      );
    }

    // Create the todo
    const todo = await createTodo({
      topic,
      reason,
      type,
      resource_title,
      resource_description,
      resource_url,
      resource_image_url,
      estimated_minutes,
      employee_uid: employee.uid,
    });

    if (!todo) {
      return NextResponse.json(
        { error: "Failed to create todo" },
        { status: 500 }
      );
    }

    // If this came from a suggestion, optionally delete the suggestion
    if (suggestion_uid) {
      await deleteSuggestion(suggestion_uid);
    }

    return NextResponse.json({
      todo: {
        uid: todo.uid,
        topic: todo.topic,
        reason: todo.reason,
        type: todo.type || "other",
        estimated_minutes: todo.estimated_minutes,
        status: todo.status,
        resource: {
          title: todo.resource_title || todo.topic,
          description: todo.resource_description || todo.reason,
          url: todo.resource_url || "",
          imageUrl: todo.resource_image_url || null,
        },
      },
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}

