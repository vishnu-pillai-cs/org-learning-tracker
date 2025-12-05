import { NextRequest, NextResponse } from "next/server";
import { cascadeStatsUpdate, getEmployeeStatsEntry, getTeamStatsEntry } from "@/lib/contentstack/stats";
import type { LearningEntry } from "@/lib/contentstack/types";

// Webhook secret for verification (set in Contentstack Automation)
const WEBHOOK_SECRET = process.env.CONTENTSTACK_WEBHOOK_SECRET;

// Simple in-memory cache to prevent duplicate processing
// In production, use Redis or similar
const processedEntries = new Map<string, number>();
const DEDUP_WINDOW_MS = 30000; // 30 seconds

function wasRecentlyProcessed(uid: string): boolean {
  const lastProcessed = processedEntries.get(uid);
  if (!lastProcessed) return false;
  
  const now = Date.now();
  if (now - lastProcessed < DEDUP_WINDOW_MS) {
    return true;
  }
  
  // Cleanup old entries
  processedEntries.delete(uid);
  return false;
}

function markAsProcessed(uid: string): void {
  processedEntries.set(uid, Date.now());
  
  // Cleanup entries older than dedup window
  const now = Date.now();
  for (const [key, timestamp] of processedEntries.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS * 2) {
      processedEntries.delete(key);
    }
  }
}

// Verify webhook signature (optional, but recommended)
function verifyWebhookSignature(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) {
    // No secret configured, skip verification
    return true;
  }
  
  const signature = req.headers.get("x-contentstack-signature");
  if (!signature) {
    return false;
  }
  
  // In production, implement proper HMAC verification
  // For now, simple comparison
  return signature === WEBHOOK_SECRET;
}

// Contentstack webhook payload structure
interface ContentstackWebhookPayload {
  event: string;
  module: string;
  api_key: string;
  data: {
    entry: LearningEntry;
    content_type: {
      uid: string;
      title: string;
    };
    locale: string;
    environment?: {
      name: string;
      uid: string;
    };
  };
}

// POST /api/webhooks/learning-sync - Handle Contentstack webhooks for learning entry changes
export async function POST(req: NextRequest) {
  // Verify webhook signature
  if (!verifyWebhookSignature(req)) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as ContentstackWebhookPayload;
    const { event, data } = payload;

    // Only process learning_entry content type
    if (data.content_type?.uid !== "learning_entry") {
      return NextResponse.json({ message: "Ignored - not a learning entry" });
    }

    const learning = data.entry;
    const entryUid = learning.uid;

    // Check for duplicate processing (stats update already done in app)
    if (wasRecentlyProcessed(entryUid)) {
      console.log(`Skipping duplicate webhook for entry ${entryUid}`);
      return NextResponse.json({ message: "Already processed" });
    }

    const employeeUid = learning.employee?.[0]?.uid;
    const teamUid = learning.team?.[0]?.uid;

    if (!employeeUid) {
      console.error("Learning entry missing employee reference:", entryUid);
      return NextResponse.json({ error: "Missing employee reference" }, { status: 400 });
    }

    // Determine action based on event type
    let action: "add" | "remove" | null = null;

    switch (event) {
      case "entry.publish":
      case "entry.create":
        // Check if stats already reflect this entry (was created via app)
        const existingStats = await getEmployeeStatsEntry(employeeUid);
        if (existingStats) {
          // Stats exist, entry might have been processed already
          // Skip to avoid double counting
          markAsProcessed(entryUid);
          return NextResponse.json({ message: "Stats already exist, skipping" });
        }
        action = "add";
        break;

      case "entry.unpublish":
      case "entry.delete":
        action = "remove";
        break;

      case "entry.update":
        // For updates, we need to handle type/duration changes
        // This is complex - skip for now, handle in app
        console.log("Entry update webhook received - handled by app");
        return NextResponse.json({ message: "Updates handled by app" });

      default:
        console.log(`Unhandled event type: ${event}`);
        return NextResponse.json({ message: "Event type not handled" });
    }

    if (action) {
      console.log(`Processing ${action} for learning ${entryUid}`);
      
      await cascadeStatsUpdate(
        learning,
        employeeUid,
        teamUid,
        action
      );

      markAsProcessed(entryUid);
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Learning sync webhook endpoint is active",
  });
}

