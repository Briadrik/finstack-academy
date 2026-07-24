
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('draft', 'pending_approval', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('video', 'youtube', 'pdf', 'slide', 'text', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE group_member_role AS ENUM ('leader', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========== USERS ==========
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== COURSES ==========
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status course_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  published BOOLEAN NOT NULL DEFAULT false, -- kept for backward compat with existing /api/courses queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep `published` in sync with `status` so existing queries (WHERE published = true) keep working.
CREATE OR REPLACE FUNCTION sync_course_published() RETURNS TRIGGER AS $$
BEGIN
  NEW.published := (NEW.status = 'published');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_course_published ON courses;
CREATE TRIGGER trg_sync_course_published
  BEFORE INSERT OR UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION sync_course_published();

-- ========== LESSONS (legacy, kept so existing course detail page keeps working) ==========
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  video_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

-- ========== CHAPTERS (new: week-based, multiple content types) ==========
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  content_type content_type NOT NULL DEFAULT 'text',
  content_url TEXT,
  content_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);

-- ========== ENROLLMENTS ==========
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- ========== PROGRESS (legacy: lessons) ==========
CREATE TABLE IF NOT EXISTS progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- ========== CHAPTER PROGRESS (new) ==========
CREATE TABLE IF NOT EXISTS chapter_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, chapter_id)
);

-- ========== GROUPS ==========
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role group_member_role NOT NULL DEFAULT 'member',
  UNIQUE (group_id, user_id)
);

-- ========== ASSIGNMENTS ==========
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  is_group_assignment BOOLEAN NOT NULL DEFAULT false,
  max_points NUMERIC(6, 2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

-- ========== SUBMISSIONS ==========
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- individual submission
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, -- OR group submission
  content_text TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);

-- ========== GRADES ==========
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  score NUMERIC(6, 2) NOT NULL,
  feedback TEXT,
  graded_by INTEGER NOT NULL REFERENCES users(id),
  graded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== MESSAGES ==========
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- direct message
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,   -- course-wide message
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,     -- group chat message
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (recipient_id IS NOT NULL)::int +
    (course_id IS NOT NULL)::int +
    (group_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_course ON messages(course_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);

-- ========== NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ========== SEED AN ADMIN (edit before running, or do it manually) ==========
-- INSERT INTO users (name, email, password_hash, role)
-- VALUES ('Admin', 'admin@finstack.academy', '<bcrypt hash>', 'admin')
-- ON CONFLICT (email) DO NOTHING;
