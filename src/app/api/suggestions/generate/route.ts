import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeByEmail } from "@/lib/contentstack/employees";
import { getLearningsByEmployee } from "@/lib/contentstack/learnings";
import { createSuggestion } from "@/lib/contentstack/suggestions";
import { generateSuggestions, type LearningContext } from "@/lib/mastra";

// POST - Generate new follow-up suggestions via AI and ADD to existing suggestions
export async function POST() {
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

    // Fetch recent learnings (last 4 for context, most recent for focus)
    const recentLearnings = await getLearningsByEmployee(employee.uid, {
      limit: 4,
    });

    if (recentLearnings.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No learnings to base suggestions on",
      });
    }

    // Transform learnings to the context format expected by the agent
    const learningContext: LearningContext[] = recentLearnings.map((l) => ({
      name: l.name,
      type: l.type,
      description: l.description,
      tags: l.tags,
      date: l.date,
    }));

    // Generate 2 follow-up suggestions via AI
    const suggestions = await generateSuggestions(learningContext);

    // Store NEW suggestions in Contentstack (don't delete old ones)
    const createdSuggestions = [];
    for (const suggestion of suggestions) {
      const created = await createSuggestion({
        topic: suggestion.topic,
        reason: suggestion.reason,
        type: suggestion.type,
        resource_title: suggestion.resource.title,
        resource_description: suggestion.resource.description,
        resource_url: suggestion.resource.url,
        resource_image_url: suggestion.resource.imageUrl || undefined,
        estimated_minutes: suggestion.estimated_minutes,
        employee_uid: employee.uid,
      });

      if (created) {
        createdSuggestions.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdSuggestions.length,
      suggestions: createdSuggestions,
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

