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
    "Search the web for learning resources on a specific topic. Returns relevant articles, tutorials, and images from actual sources. Returns null if no relevant results found.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe("The learning topic to search for resources about"),
    type: z
      .enum(["article", "tutorial", "course", "video", "documentation"])
      .optional()
      .describe("The type of resource to prioritize in search"),
  }),
  outputSchema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string(),
    imageUrl: z.string().nullable(),
    found: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { topic, type } = context;

    const searchQuery = type ? `${topic} ${type}` : `${topic} tutorial`;

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

