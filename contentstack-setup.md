# Contentstack Content Types Setup

Create these content types in your Contentstack stack. Go to **Content Models** > **+ New Content Type**.

---

## 1. Employee (`employee`)

| Field Name | Field UID | Field Type | Settings |
|------------|-----------|------------|----------|
| Title | `title` | Single Line Textbox | Required, Unique |
| Google ID | `google_id` | Single Line Textbox | Required, Unique |
| Email | `email` | Single Line Textbox | Required, Unique |
| Name | `name` | Single Line Textbox | Required |
| Avatar URL | `avatar_url` | Single Line Textbox | Optional |
| Role | `role` | Select | Required, Options: `employee`, `manager`, `org_admin` |
| Status | `status` | Select | Required, Options: `active`, `inactive`, `invited` |
| Manager | `manager` | Reference | Optional, Single, Reference to: `employee` |
| Team | `team` | Reference | Optional, Single, Reference to: `team` |

---

## 2. Team (`team`)

| Field Name | Field UID | Field Type | Settings |
|------------|-----------|------------|----------|
| Title | `title` | Single Line Textbox | Required, Unique |
| Name | `name` | Single Line Textbox | Required |
| Description | `description` | Multi Line Textbox | Optional |
| Manager | `manager` | Reference | Required, Single, Reference to: `employee` |
| Status | `status` | Select | Required, Options: `active`, `archived` |

---

## 3. Learning Entry (`learning_entry`)

| Field Name | Field UID | Field Type | Settings |
|------------|-----------|------------|----------|
| Title | `title` | Single Line Textbox | Required |
| Description | `description` | Rich Text Editor | Optional |
| Type | `type` | Select | Required, Options: `course`, `article`, `video`, `project`, `other` |
| Source URL | `source_url` | Single Line Textbox | Optional |
| Date | `date` | Date | Required |
| Duration (minutes) | `duration_minutes` | Number | Optional |
| Tags | `tags` | Single Line Textbox | Optional, Multiple |
| Employee | `employee` | Reference | Required, Single, Reference to: `employee` |
| Team | `team` | Reference | Optional, Single, Reference to: `team` |
| Visibility | `visibility` | Select | Required, Options: `team`, `org`, `private` |

---

## 4. Invitation (`invitation`)

| Field Name | Field UID | Field Type | Settings |
|------------|-----------|------------|----------|
| Title | `title` | Single Line Textbox | Required |
| Email | `email` | Single Line Textbox | Required |
| Name | `name` | Single Line Textbox | Optional |
| Token | `token` | Single Line Textbox | Required, Unique |
| Role | `role` | Select | Required, Options: `employee`, `manager` |
| Team | `team` | Reference | Optional, Single, Reference to: `team` |
| Invited By | `invited_by` | Reference | Required, Single, Reference to: `employee` |
| Status | `status` | Select | Required, Options: `pending`, `accepted`, `expired`, `revoked` |
| Expires At | `expires_at` | Date | Required |

---

## Environment Variables

After creating the content types, get these values from Contentstack:

1. **API Key**: Settings > Stack > API Credentials > API Key
2. **Delivery Token**: Settings > Tokens > Delivery Tokens > Create
3. **Management Token**: Settings > Tokens > Management Tokens > Create (with write permissions)
4. **Environment**: Usually `production` or `development`

Add them to your `.env.local`:

```bash
CONTENTSTACK_API_KEY=your_api_key
CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token
CONTENTSTACK_ENVIRONMENT=production
```

---

## Contentstack Automate Setup (for Email Invitations)

### Step 1: Create the Automation

1. Go to **Automate** in your Contentstack dashboard
2. Click **+ New Automation**
3. Give it a name: "Send Invitation Email"

### Step 2: Configure the Trigger

1. **Trigger Type**: Entry
2. **Event**: Entry Published
3. **Content Type**: `invitation`
4. Add a **Condition**:
   - Field: `status`
   - Operator: `equals`
   - Value: `pending`

### Step 3: Set Up Email Action

1. Add **Action**: Send Email
2. If you haven't connected an email service, click "Connect" and choose:
   - **SendGrid** (recommended for production)
   - **SMTP** (for custom email servers)
   - **Mailgun** (alternative option)

3. Configure the email:
   - **To**: `{{entry.email}}`
   - **From**: `noreply@yourcompany.com` (or your verified sender)
   - **Subject**: `You've been invited to join LearnTrack!`
   
4. **Email Body** (HTML template):

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 12px; margin: 0 auto 15px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"></div>
      <h1>You're Invited!</h1>
    </div>
    
    <p>Hi {{entry.name}},</p>
    
    <p>You've been invited to join <strong>LearnTrack</strong> as a <strong>{{entry.role}}</strong>.</p>
    
    <p>LearnTrack helps you track your learning journey, log courses, articles, and projects, and see your progress over time.</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{YOUR_APP_URL}}/invite/accept?token={{entry.token}}" class="button">
        Accept Invitation
      </a>
    </p>
    
    <p>This invitation will expire on {{entry.expires_at}}.</p>
    
    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
```

**Note**: Replace `{{YOUR_APP_URL}}` with your actual application URL (e.g., `https://learntrack.yourcompany.com`).

### Step 4: Test the Automation

1. Save and activate the automation
2. Create a test invitation in your app
3. Check that the email is sent and the link works

### Optional: Invitation Reminder Automation

Create a second automation for reminder emails:

1. **Trigger**: Scheduled (e.g., daily at 9 AM)
2. **Action**: Query invitations where:
   - `status` equals `pending`
   - `created_at` is older than 3 days
   - `expires_at` is in the future
3. **Action**: Send reminder email to each matching invitation

---

## Initial Admin User

After setting up, manually create the first `employee` entry:

1. Go to **Content** > **employee** > **+ New Entry**
2. Fill in:
   - **Title**: Your name
   - **Google ID**: (leave empty for now, will be set on first login)
   - **Email**: Your Google account email
   - **Name**: Your name
   - **Role**: `org_admin`
   - **Status**: `active`
3. **Publish** the entry

When you first sign in with Google, the system will link your Google ID to this entry.

