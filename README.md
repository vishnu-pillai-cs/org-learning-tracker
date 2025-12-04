# Organization Learning Tracker

A modern web application for tracking employee learning and development across an organization. Built with Next.js and powered by Contentstack as a headless CMS.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![Contentstack](https://img.shields.io/badge/Contentstack-CMS-purple)

## Features

### For Employees
- 📚 Log learning activities (courses, articles, videos, projects)
- 📊 View personal learning statistics and progress
- 🏷️ Tag and categorize learnings
- 📈 Track learning hours and trends

### For Managers
- 👥 View team learning statistics
- 📋 Browse team members' learning entries
- ✉️ Invite new team members
- 🔧 Manage team membership

### For Org Admins
- 🏢 Organization-wide analytics dashboard
- 👤 Manage all users and roles
- 🏗️ Create and manage teams
- 📧 Send invitations to anyone in the org

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **CMS**: Contentstack (Delivery + Management SDK)
- **Authentication**: NextAuth.js with Google OAuth
- **Deployment**: Contentstack Launch

## Prerequisites

- Node.js 18+ or Bun
- A Contentstack account with a stack
- Google Cloud Console project for OAuth

## Quick Start

### 1. Clone the repository

```bash
git clone git@github.com:vishnu-pillai-cs/org-learning-tracker.git
cd org-learning-tracker
```

### 2. Install dependencies

```bash
bun install
# or
npm install
```

### 3. Set up Contentstack

Create the following content types in your Contentstack stack:

- `employee` - User profiles with roles and team assignments
- `team` - Team definitions with managers
- `learning_entry` - Individual learning records
- `invitation` - Pending user invitations

> 📖 See [contentstack-setup.md](./contentstack-setup.md) for detailed field definitions.

### 4. Configure environment variables

Create a `.env.local` file:

```bash
# Contentstack
CONTENTSTACK_API_KEY=your_api_key
CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token
CONTENTSTACK_ENVIRONMENT=development

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:6767
```

### 5. Create your admin user

In Contentstack, create an `employee` entry:
- **Email**: Your Google account email
- **Role**: `org_admin`
- **Status**: `active`

### 6. Run the development server

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:6767](http://localhost:6767) and sign in with Google.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & invite acceptance pages
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── admin/        # Org admin pages
│   │   ├── dashboard/    # Employee dashboard
│   │   ├── learnings/    # Learning CRUD pages
│   │   ├── team/         # Manager team pages
│   │   └── profile/      # User profile
│   └── api/              # API routes
│       ├── auth/         # NextAuth endpoints
│       ├── employees/    # Employee management
│       ├── invitations/  # Invitation system
│       ├── learnings/    # Learning CRUD
│       ├── stats/        # Analytics endpoints
│       └── teams/        # Team management
├── components/
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature components
└── lib/
    ├── auth/             # NextAuth configuration
    └── contentstack/     # Contentstack SDK helpers
```

## API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/*` | GET, POST | NextAuth.js authentication |
| `/api/employees` | GET | List employees |
| `/api/employees/me` | GET | Current user profile |
| `/api/employees/[uid]` | PATCH | Update employee |
| `/api/teams` | GET, POST | List/create teams |
| `/api/teams/[uid]` | GET, PATCH | Get/update team |
| `/api/learnings` | GET, POST | List/create learnings |
| `/api/learnings/[uid]` | GET, PATCH, DELETE | Learning CRUD |
| `/api/invitations` | GET, POST | List/create invitations |
| `/api/invitations/accept` | POST | Accept invitation |
| `/api/invitations/revoke` | POST | Revoke invitation |
| `/api/stats/me` | GET | Personal statistics |
| `/api/stats/team/[uid]` | GET | Team statistics |
| `/api/stats/org` | GET | Organization statistics |

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `employee` | View/manage own learnings, view own stats |
| `manager` | All employee permissions + view team stats, invite team members |
| `org_admin` | Full access to all users, teams, and organization data |

## Deployment on Contentstack Launch

1. Push code to GitHub
2. Go to Contentstack → Launch → New Project
3. Import from your GitHub repository
4. Add environment variables
5. Deploy!

> 📖 See the deployment section in the setup guide for detailed steps.

## Email Notifications (Optional)

Set up Contentstack Automate to send invitation emails:

1. Create an automation triggered on `invitation` publish
2. Connect an email service (SendGrid, SMTP, etc.)
3. Configure email template with invite link

> 📖 See [contentstack-setup.md](./contentstack-setup.md) for the email template.

## Scripts

```bash
bun run dev      # Start development server on port 6767
bun run build    # Build for production
bun run start    # Start production server
bun run lint     # Run ESLint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your organization.

---

Built with ❤️ using [Next.js](https://nextjs.org) and [Contentstack](https://www.contentstack.com)
