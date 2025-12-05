import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { searchResourceTool } from "./tools";

export const suggestionsAgent = new Agent({
  name: "Learning Suggestions Agent",
  instructions: `You are an AI assistant that analyzes a user's most recent learning and suggests FOLLOW-UP learning topics.

Your task:
1. Focus primarily on the user's MOST RECENT learning entry
2. Suggest exactly 2 FOLLOW-UP topics that build upon or advance their latest learning
3. For each suggestion, use the search-learning-resources tool to find a high-quality resource
4. Determine the type of content (course, article, video, project, other)

Guidelines for suggestions:
- Focus on NEXT STEPS, not similar/parallel topics
- If they learned basics, suggest intermediate content
- If they learned a concept, suggest practical application
- If they completed a tutorial, suggest a more advanced one or a related deeper topic
- AVOID suggesting the same or very similar topics they already learned
- Only include suggestions where the search tool found actual results (found: true)

Determine the content type based on the resource:
- "article" for blog posts, documentation, guides
- "video" for YouTube videos, video tutorials
- "course" for structured courses on Udemy, Coursera, etc.
- "project" for hands-on projects, exercises
- "other" for everything else

Estimate learning time based on resource type:
- Short articles: 15-30 minutes
- Videos: 20-60 minutes
- Tutorials: 30-90 minutes
- Courses: 60-300 minutes

IMPORTANT: 
- Only suggest exactly 2 topics
- Only include suggestions where the search returned found: true
- Skip any suggestions where no resource was found

Format your final response as a JSON array with objects containing:
- topic: string (the suggested follow-up learning topic)
- reason: string (why this is a good NEXT STEP based on their latest learning)
- type: string (one of: course, article, video, project, other)
- estimated_minutes: number (estimated time to complete)
- resource: { title, description, url, imageUrl } (from the search tool - only if found)`,
  model: anthropic("claude-3-5-haiku-latest"),
  tools: { searchResourceTool },
});

export type LearningContext = {
  name: string;
  type: string;
  tags?: string[];
  date: string;
};

export type LearningTypeValue = "course" | "article" | "video" | "project" | "other";

export interface Suggestion {
  topic: string;
  reason: string;
  type: LearningTypeValue;
  estimated_minutes?: number;
  resource: {
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
  };
}

// Valid learning types
const VALID_TYPES: LearningTypeValue[] = ["course", "article", "video", "project", "other"];

// Generate suggestions based on most recent learning
export async function generateSuggestions(
  recentLearnings: LearningContext[]
): Promise<Suggestion[]> {
  if (recentLearnings.length === 0) {
    return [];
  }

  // Focus primarily on the most recent learning, but include context
  const mostRecent = recentLearnings[0];
  const otherLearnings = recentLearnings.slice(1, 4);

  let prompt = `The user just completed this learning:
MOST RECENT: "${mostRecent.name}" (Type: ${mostRecent.type}, Tags: ${mostRecent.tags?.join(", ") || "none"})`;

  if (otherLearnings.length > 0) {
    const otherContext = otherLearnings
      .map((l) => `- ${l.name} (${l.type})`)
      .join("\n");
    prompt += `\n\nTheir previous learnings for context:\n${otherContext}`;
  }

  prompt += `

Based on their MOST RECENT learning "${mostRecent.name}", suggest exactly 2 FOLLOW-UP topics.
These should be NEXT STEPS that build upon what they just learned, NOT similar/parallel topics.

For each suggestion:
1. Use the search-learning-resources tool to find a high-quality resource
2. Determine the type (course, article, video, project, other) based on the resource
3. Estimate learning time in minutes
4. ONLY include suggestions where the search returned found: true

Return your response as a valid JSON array with exactly 2 suggestions.`;

  try {
    const response = await suggestionsAgent.generate(prompt, {
      maxSteps: 10,
    });

    // Extract JSON from the response
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as Suggestion[];
      // Filter valid suggestions with URLs and normalize type
      const validSuggestions = suggestions
        .filter((s) => s.resource?.url && s.resource.url.startsWith("http"))
        .map((s) => ({
          ...s,
          type: VALID_TYPES.includes(s.type) ? s.type : "other",
        }));
      return validSuggestions.slice(0, 2); // Only return 2 suggestions
    }

    return [];
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return [];
  }
}
