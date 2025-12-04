import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessLearning, canModifyLearning } from "@/lib/auth/rbac";
import {
  getLearningByUid,
  updateLearning,
  deleteLearning,
} from "@/lib/contentstack/learnings";
import type { UpdateLearningInput } from "@/lib/contentstack/types";

// GET /api/learnings/[uid] - Get learning by UID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  try {
    const learning = await getLearningByUid(uid);

    if (!learning) {
      return NextResponse.json(
        { error: "Learning entry not found" },
        { status: 404 }
      );
    }

    // Check access permission
    const canAccess = canAccessLearning(
      session.user.employeeUid,
      session.user.role,
      session.user.teamUid,
      learning
    );

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ learning });
  } catch (error) {
    console.error("Failed to fetch learning:", error);
    return NextResponse.json(
      { error: "Failed to fetch learning" },
      { status: 500 }
    );
  }
}

// PATCH /api/learnings/[uid] - Update learning
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  try {
    const learning = await getLearningByUid(uid);

    if (!learning) {
      return NextResponse.json(
        { error: "Learning entry not found" },
        { status: 404 }
      );
    }

    // Check modify permission
    const canModify = canModifyLearning(
      session.user.employeeUid,
      session.user.role,
      learning
    );

    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: UpdateLearningInput = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.source_url !== undefined) updateData.source_url = body.source_url;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.duration_minutes !== undefined)
      updateData.duration_minutes = body.duration_minutes;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;

    const updatedLearning = await updateLearning(uid, updateData);

    return NextResponse.json({ learning: updatedLearning });
  } catch (error) {
    console.error("Failed to update learning:", error);
    return NextResponse.json(
      { error: "Failed to update learning" },
      { status: 500 }
    );
  }
}

// DELETE /api/learnings/[uid] - Delete learning
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid } = await params;

  try {
    const learning = await getLearningByUid(uid);

    if (!learning) {
      return NextResponse.json(
        { error: "Learning entry not found" },
        { status: 404 }
      );
    }

    // Check modify permission
    const canModify = canModifyLearning(
      session.user.employeeUid,
      session.user.role,
      learning
    );

    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteLearning(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete learning:", error);
    return NextResponse.json(
      { error: "Failed to delete learning" },
      { status: 500 }
    );
  }
}

