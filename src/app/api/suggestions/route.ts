import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployeeByEmail } from "@/lib/contentstack/employees";
import { getSuggestionsByEmployee } from "@/lib/contentstack/suggestions";

// GET - Fetch stored suggestions from Contentstack
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

    // Fetch suggestions from Contentstack
    const suggestions = await getSuggestionsByEmployee(employee.uid);

    // Sort by created_at (most recent first) and transform to frontend format
    const formattedSuggestions = suggestions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((s) => ({
        uid: s.uid,
        topic: s.topic,
        reason: s.reason,
        type: s.type || "other",
        estimated_minutes: s.estimated_minutes,
        created_at: s.created_at,
        resource: {
          title: s.resource_title || s.topic,
          description: s.resource_description || s.reason,
          url: s.resource_url || "",
          imageUrl: s.resource_image_url || null,
        },
      }));

    return NextResponse.json({ suggestions: formattedSuggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
