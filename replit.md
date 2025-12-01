# School Online Voting System (SchoolVote)

## Overview
A complete MVP of a School Online Voting System with separate admin and student portals. The system supports election management, candidate registration, secure voting, and real-time results tracking.

## User Accounts

### Default Admin Account
- **Admin ID:** admin
- **Password:** admin123

### Student Accounts
Students can register via the signup page. Accounts require admin approval before students can vote.

## Features

### Admin Portal
- **Dashboard:** View stats (total students, active elections, votes cast)
- **Manage Elections:** Create, edit, delete elections with start/end times
- **Manage Candidates:** Add posts (e.g., President, Sports Captain) and candidates
- **Manage Users:** Approve, block, or set students to pending status
- **Results:** View live vote counts and publish results

### Student Portal
- **Dashboard:** Overview of upcoming and live elections
- **Upcoming Elections:** View scheduled elections
- **Live Elections:** See currently active elections
- **Cast Vote:** Vote in live elections (one vote per election)
- **Results:** View published election results
- **Profile:** Update personal information and password

## Technical Stack

### Frontend
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling
- Dark/Light theme support

### Backend
- Express.js with TypeScript
- Session-based authentication
- JSON file database (database.json)
- Zod validation

## Project Structure

```
client/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── admin/       # Admin pages
│   │   └── student/     # Student pages
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilities and auth
server/
├── routes.ts            # API endpoints
├── storage.ts           # JSON database operations
└── index.ts             # Server entry point
shared/
└── schema.ts            # Type definitions and validation schemas
```

## API Endpoints

### Authentication
- `POST /api/auth/login/student` - Student login
- `POST /api/auth/login/admin` - Admin login
- `POST /api/auth/register/student` - Student registration
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/status` - Update user status
- `GET /api/admin/recent-voters` - Recent voter activity

### Elections
- `GET /api/elections` - List all elections
- `POST /api/elections` - Create election
- `PATCH /api/elections/:id` - Update election
- `DELETE /api/elections/:id` - Delete election
- `PATCH /api/elections/:id/publish` - Publish/unpublish results
- `GET /api/elections/:id/results` - Get election results

### Posts & Candidates
- `POST /api/elections/:electionId/posts` - Add post
- `PATCH /api/elections/:electionId/posts/:postId` - Update post
- `DELETE /api/elections/:electionId/posts/:postId` - Delete post
- `POST /api/elections/:electionId/posts/:postId/candidates` - Add candidate
- `PATCH /api/elections/:electionId/posts/:postId/candidates/:candidateId` - Update candidate
- `DELETE /api/elections/:electionId/posts/:postId/candidates/:candidateId` - Delete candidate

### Voting
- `POST /api/votes` - Cast vote

## Election Rules
- Elections have start and end times
- Students can only vote in approved status
- One vote per student per election
- Results can be published/unpublished by admin
- Students can only view published results

## Development

The application runs on port 5000 with:
- Frontend: React SPA with Vite
- Backend: Express API

To start: `npm run dev`

## Recent Changes
- Initial MVP implementation with full admin and student portals
- JSON file-based database for data persistence
- Session-based authentication with express-session
- Dark/light theme toggle
- Responsive design for mobile and desktop
