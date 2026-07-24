# FinStack Academy

Vite + React client, Express + PostgreSQL (raw `pg`, no ORM) server.

## What's in this update

The app has grown from a simple course marketplace into a role-based LMS:

- **Roles**: `admin`, `teacher`, `student` (chosen at signup for teacher/student; admins are promoted manually or by another admin).
- **Course approval workflow**: teachers create courses as `draft`, submit for review (`pending_approval`), and an admin `approve`s or `reject`s them before they go `published`.
- **Chapters**: week-based course content with multiple types (`video`, `youtube`, `pdf`, `slide`, `text`, `link`). The old `lessons` table still works — the course player merges both into one list.
- **Assignments**: individual or group, with due dates and a max point value.
- **Groups**: teachers create groups per course and assign enrolled students to them.
- **Submissions & grading**: students submit text or a file link; teachers grade with a score + feedback from the course builder.
- **Admin panel**: approve/reject pending courses, change any user's role.

## Project structure

```
client/   Vite + React frontend
server/   Express + pg backend
```

## Setup

### 1. Database

Create a PostgreSQL database, then run the schema (adds new tables and enums; safe to re-run):

```bash
cd server
cp .env.example .env
# edit .env with your real DATABASE_URL and a strong JWT_SECRET
npm install
npm run migrate   # runs src/db/schema.sql against $DATABASE_URL
```

> Note: the previous `.env` in this repo had a real local password committed — treat it as compromised, rotate it, and keep `.env` out of version control from now on (a `.gitignore` has been added).

Optionally promote your own account to admin after signing up:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### 2. Server

```bash
cd server
npm run dev   # http://localhost:4000
```

### 3. Client

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

## How the roles work end to end

1. Sign up choosing "I'm a teacher" → lands on `/teacher`.
2. Create a course (starts as `draft`) → go to its builder (`/teacher/courses/:id`):
   - **Details**: edit title/description/price, then "Submit for approval".
   - **Chapters**: add week-by-week content.
   - **Assignments**: create assignments, view submissions, grade inline.
   - **Groups**: create groups, add enrolled students to them.
3. Sign up (or log in) as an admin → `/admin` → **Approvals** tab approves/rejects pending courses; **Users** tab can change anyone's role.
4. Once published, students see the course on the public catalog (`/`), enroll, and go through `/courses/:id/learn` (chapters + legacy lessons) and `/courses/:id/assignments` (submit work, see grades).

## Known gaps / next steps

Not built yet, but the schema already has tables ready for them:
- Messaging UI (`messages` table exists; no routes/pages yet)
- Notifications UI (`notifications` table exists; nothing triggers inserts into it yet)
- Teacher-facing analytics/charts on submissions and progress
- Real file uploads (submissions currently take a pasted link, not a file upload)
