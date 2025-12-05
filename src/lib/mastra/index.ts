import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { searchResourceTool } from "./tools";

export const suggestionsAgent = new Agent({
  name: "LearnForge Growth Agent",
  instructions: `You are a career growth advisor that helps users LEVEL UP their skills. Your job is to identify what they should learn NEXT to advance their career and expertise.

Your task:
1. Analyze the user's MOST RECENT learning to understand their current skill level
2. Suggest exactly 2 GROWTH-ORIENTED topics that will help them ADVANCE beyond their current knowledge
3. For each suggestion, use the search-learning-resources tool to find a high-quality resource
4. Focus on skill progression, not repetition

GROWTH STRATEGY - Think like a mentor:
- If they learned fundamentals → suggest intermediate/advanced applications
- If they learned a library → suggest architecture patterns or production best practices
- If they learned theory → suggest hands-on projects to apply it
- If they built something basic → suggest scaling, optimization, or professional techniques
- If they learned one technology → suggest complementary skills that make them more valuable

AVOID THESE MISTAKES:
- ❌ Suggesting the same topic with different wording
- ❌ Suggesting beginner content when they're past that level
- ❌ Suggesting parallel/similar topics instead of advancement
- ❌ Generic "learn more about X" suggestions

GOOD GROWTH EXAMPLES:
- Learned "React basics" → Suggest "React performance optimization" or "Building production React apps"
- Learned "Python fundamentals" → Suggest "Python design patterns" or "Building REST APIs with FastAPI"
- Learned "Git basics" → Suggest "Git workflows for teams" or "Advanced Git rebasing strategies"
- Learned "CSS" → Suggest "CSS architecture (BEM/ITCSS)" or "Advanced CSS animations"

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
- topic: string (the NEXT-LEVEL skill to learn)
- reason: string (how this ADVANCES their career beyond their recent learning)
- type: string (one of: course, article, video, project, other)
- estimated_minutes: number (estimated time to complete)
- resource: { title, description, url, imageUrl } (from the search tool - only if found)`,
  model: anthropic("claude-3-5-haiku-latest"),
  tools: { searchResourceTool },
});

export type LearningContext = {
  name: string;
  type: string;
  description?: string;
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

// Generate suggestions based on the last added learning only
export async function generateSuggestions(
  recentLearnings: LearningContext[]
): Promise<Suggestion[]> {
  if (recentLearnings.length === 0) {
    return [];
  }

  // Use ONLY the most recent learning - no history context
  const lastLearning = recentLearnings[0];

  // Build context with description if available
  let learningContext = `"${lastLearning.name}" (Type: ${lastLearning.type}`;
  if (lastLearning.tags?.length) {
    learningContext += `, Tags: ${lastLearning.tags.join(", ")}`;
  }
  learningContext += ")";
  
  if (lastLearning.description) {
    learningContext += `\nDescription: ${lastLearning.description}`;
  }

  const prompt = `The user just completed: ${learningContext}

Recommend exactly 2 NEXT-LEVEL skills to help them GROW beyond "${lastLearning.name}".

Consider:
- What would a senior developer learn AFTER this?
- What complementary skill would make them more valuable?
- What's the natural PROGRESSION from here?

DO NOT suggest:
- The same topic they just learned
- Beginner-level content
- Vague "learn more about X" suggestions

For each suggestion:
1. Use the search-learning-resources tool with a GROWTH-FOCUSED query (e.g., "advanced X", "X best practices", "X in production")
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
