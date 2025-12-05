import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: {
    src: string;
  };
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
}

export const searchResourceTool = createTool({
  id: "search-learning-resources",
  description:
    "Search the web for GROWTH-ORIENTED learning resources. Use this to find advanced tutorials, best practices, and next-level content that helps users progress beyond basics.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe("The NEXT-LEVEL learning topic to search for (e.g., 'advanced React patterns', 'production Node.js best practices')"),
    type: z
      .enum(["article", "tutorial", "course", "video", "documentation"])
      .optional()
      .describe("The type of resource to prioritize in search"),
    skillLevel: z
      .enum(["intermediate", "advanced", "expert"])
      .optional()
      .describe("Target skill level for the resource"),
  }),
  outputSchema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string(),
    imageUrl: z.string().nullable(),
    found: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { topic, type, skillLevel } = context;

    // Build a growth-focused search query
    const levelKeywords = {
      intermediate: "intermediate guide",
      advanced: "advanced tutorial",
      expert: "expert deep dive",
    };
    
    const levelModifier = skillLevel ? levelKeywords[skillLevel] : "best practices";
    const typeModifier = type || "tutorial";
    
    // Construct query that avoids beginner content
    const searchQuery = `${topic} ${levelModifier} ${typeModifier} -beginner -introduction -basics`;

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      console.log("No BRAVE_SEARCH_API_KEY found");
      return {
        title: "",
        description: "",
        url: "",
        imageUrl: null,
        found: false,
      };
    }

    try {
      const searchResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": apiKey,
          },
        }
      );

      if (!searchResponse.ok) {
        console.error(`Brave Search API error: ${searchResponse.status}`);
        return {
          title: "",
          description: "",
          url: "",
          imageUrl: null,
          found: false,
        };
      }

      const searchData: BraveSearchResponse = await searchResponse.json();
      const results = searchData.web?.results || [];

      // Find the best result (skip search engine results pages)
      const goodResult = results.find((r) => {
        const url = r.url.toLowerCase();
        return !url.includes("google.com/search") &&
               !url.includes("bing.com/search") &&
               !url.includes("search.brave.com") &&
               !url.includes("duckduckgo.com");
      });

      if (goodResult) {
        return {
          title: goodResult.title,
          description: goodResult.description,
          url: goodResult.url,
          imageUrl: goodResult.thumbnail?.src || null,
          found: true,
        };
      }

      return {
        title: "",
        description: "",
        url: "",
        imageUrl: null,
        found: false,
      };
    } catch (error) {
      console.error("Search tool error:", error);
      return {
        title: "",
        description: "",
        url: "",
        imageUrl: null,
        found: false,
      };
    }
  },
});

