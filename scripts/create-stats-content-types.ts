/**
 * Script to create stats content types in Contentstack
 * 
 * Run with: npx tsx scripts/create-stats-content-types.ts
 * 
 * Make sure these env vars are set:
 * - CONTENTSTACK_API_KEY
 * - CONTENTSTACK_MANAGEMENT_TOKEN
 */

import * as contentstack from "@contentstack/management";

// Validate environment variables
const API_KEY = process.env.CONTENTSTACK_API_KEY;
const MANAGEMENT_TOKEN = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;

if (!API_KEY || !MANAGEMENT_TOKEN) {
  console.error("Missing required environment variables:");
  console.error("- CONTENTSTACK_API_KEY");
  console.error("- CONTENTSTACK_MANAGEMENT_TOKEN");
  process.exit(1);
}

// Initialize client
const client = contentstack.client();
const stack = client.stack({
  api_key: API_KEY,
  management_token: MANAGEMENT_TOKEN,
});

// Content type definitions
const employeeStatsContentType = {
  content_type: {
    title: "Employee Stats",
    uid: "employee_stats",
    schema: [
      {
        display_name: "Title",
        uid: "title",
        data_type: "text",
        field_metadata: { _default: true },
        unique: true,
        mandatory: true,
      },
      {
        display_name: "Employee",
        uid: "employee",
        data_type: "reference",
        reference_to: ["employee"],
        field_metadata: { ref_multiple: false },
        mandatory: true,
      },
      {
        display_name: "Total Learnings",
        uid: "total_learnings",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Total Minutes",
        uid: "total_minutes",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Current Streak",
        uid: "current_streak",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Longest Streak",
        uid: "longest_streak",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Last Learning Date",
        uid: "last_learning_date",
        data_type: "text",
        field_metadata: { description: "ISO date string" },
        mandatory: false,
      },
      {
        display_name: "Learnings By Type",
        uid: "learnings_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Hours By Type",
        uid: "hours_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Activity Dates",
        uid: "activity_dates",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array of last 90 days" },
        mandatory: true,
      },
      {
        display_name: "Computed At",
        uid: "computed_at",
        data_type: "text",
        field_metadata: { description: "ISO timestamp" },
        mandatory: true,
      },
    ],
    options: {
      is_page: false,
      singleton: false,
      title: "title",
    },
  },
};

const teamStatsContentType = {
  content_type: {
    title: "Team Stats",
    uid: "team_stats",
    schema: [
      {
        display_name: "Title",
        uid: "title",
        data_type: "text",
        field_metadata: { _default: true },
        unique: true,
        mandatory: true,
      },
      {
        display_name: "Team",
        uid: "team",
        data_type: "reference",
        reference_to: ["team"],
        field_metadata: { ref_multiple: false },
        mandatory: true,
      },
      {
        display_name: "Total Learnings",
        uid: "total_learnings",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Total Minutes",
        uid: "total_minutes",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Active Learners",
        uid: "active_learners",
        data_type: "number",
        field_metadata: { default_value: 0, description: "Employees with activity" },
        mandatory: true,
      },
      {
        display_name: "Learnings By Type",
        uid: "learnings_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Hours By Type",
        uid: "hours_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Activity Dates",
        uid: "activity_dates",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array" },
        mandatory: true,
      },
      {
        display_name: "Top Learners",
        uid: "top_learners",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array of top performers" },
        mandatory: true,
      },
      {
        display_name: "Computed At",
        uid: "computed_at",
        data_type: "text",
        field_metadata: { description: "ISO timestamp" },
        mandatory: true,
      },
    ],
    options: {
      is_page: false,
      singleton: false,
      title: "title",
    },
  },
};

const orgStatsContentType = {
  content_type: {
    title: "Org Stats",
    uid: "org_stats",
    schema: [
      {
        display_name: "Title",
        uid: "title",
        data_type: "text",
        field_metadata: { _default: true },
        unique: true,
        mandatory: true,
      },
      {
        display_name: "Total Learnings",
        uid: "total_learnings",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Total Minutes",
        uid: "total_minutes",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Total Active Employees",
        uid: "total_active_employees",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Total Active Teams",
        uid: "total_active_teams",
        data_type: "number",
        field_metadata: { default_value: 0 },
        mandatory: true,
      },
      {
        display_name: "Learnings By Type",
        uid: "learnings_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Hours By Type",
        uid: "hours_by_type",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON object" },
        mandatory: true,
      },
      {
        display_name: "Activity Dates",
        uid: "activity_dates",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array" },
        mandatory: true,
      },
      {
        display_name: "Top Teams",
        uid: "top_teams",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array of top teams" },
        mandatory: true,
      },
      {
        display_name: "Top Learners",
        uid: "top_learners",
        data_type: "text",
        field_metadata: { multiline: true, description: "JSON array of top performers" },
        mandatory: true,
      },
      {
        display_name: "Computed At",
        uid: "computed_at",
        data_type: "text",
        field_metadata: { description: "ISO timestamp" },
        mandatory: true,
      },
    ],
    options: {
      is_page: false,
      singleton: true, // Only one org stats entry
      title: "title",
    },
  },
};

async function createContentType(definition: typeof employeeStatsContentType) {
  const uid = definition.content_type.uid;
  
  try {
    // Check if content type exists
    const existing = await stack.contentType(uid).fetch();
    console.log(`⚠️  Content type "${uid}" already exists, skipping...`);
    return existing;
  } catch {
    // Content type doesn't exist, create it
    console.log(`Creating content type: ${uid}...`);
    const created = await stack.contentType().create(definition);
    console.log(`✅ Created content type: ${uid}`);
    return created;
  }
}

async function main() {
  console.log("🚀 Creating stats content types in Contentstack...\n");

  try {
    // Create content types in order
    await createContentType(employeeStatsContentType);
    await createContentType(teamStatsContentType);
    await createContentType(orgStatsContentType);

    console.log("\n✅ All content types created successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Go to Contentstack dashboard to verify the content types");
    console.log("2. Set up Automation for learning_entry webhooks");
    console.log("3. Add CONTENTSTACK_WEBHOOK_SECRET to your .env file");
  } catch (error) {
    console.error("\n❌ Error creating content types:", error);
    process.exit(1);
  }
}

main();

