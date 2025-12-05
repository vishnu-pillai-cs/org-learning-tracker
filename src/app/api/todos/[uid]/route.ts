import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeByEmail } from "@/lib/contentstack/employees";
import {
  getTodoByUid,
  updateTodoStatus,
  deleteTodo,
} from "@/lib/contentstack/todos";

// PATCH - Update todo status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
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

    const { uid } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["pending", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status (pending/completed) is required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to this user
    const existingTodo = await getTodoByUid(uid);
    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // Check ownership
    const todoEmployeeUid = existingTodo.employee?.[0]?.uid;
    if (todoEmployeeUid !== employee.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedTodo = await updateTodoStatus(uid, status);

    if (!updatedTodo) {
      return NextResponse.json(
        { error: "Failed to update todo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      todo: {
        uid: updatedTodo.uid,
        topic: updatedTodo.topic,
        reason: updatedTodo.reason,
        estimated_minutes: updatedTodo.estimated_minutes,
        status: updatedTodo.status,
        resource: {
          title: updatedTodo.resource_title || updatedTodo.topic,
          description: updatedTodo.resource_description || updatedTodo.reason,
          url: updatedTodo.resource_url || "",
          imageUrl: updatedTodo.resource_image_url || null,
        },
      },
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
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

    const { uid } = await params;

    // Verify the todo belongs to this user
    const existingTodo = await getTodoByUid(uid);
    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // Check ownership
    const todoEmployeeUid = existingTodo.employee?.[0]?.uid;
    if (todoEmployeeUid !== employee.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deleted = await deleteTodo(uid);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete todo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}

