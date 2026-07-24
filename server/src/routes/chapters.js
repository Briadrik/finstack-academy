const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const CONTENT_TYPES = ['video', 'youtube', 'pdf', 'slide', 'text', 'link'];

async function assertOwnsCourse(courseId, user) {
  const result = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (result.rows.length === 0) return { error: 'Course not found', status: 404 };
  const course = result.rows[0];
  if (user.role !== 'admin' && course.instructor_id !== user.id) {
    return { error: 'You do not own this course', status: 403 };
  }
  return { course };
}

// List chapters for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, course_id, title, week_number, content_type, content_url, content_text, position, created_at
       FROM chapters WHERE course_id = $1 ORDER BY week_number ASC, position ASC`,
      [req.params.courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a chapter
router.post('/course/:courseId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, week_number, content_type, content_url, content_text, position } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (content_type && !CONTENT_TYPES.includes(content_type)) {
    return res.status(400).json({ error: `content_type must be one of: ${CONTENT_TYPES.join(', ')}` });
  }
  const owns = await assertOwnsCourse(req.params.courseId, req.user);
  if (owns.error) return res.status(owns.status).json({ error: owns.error });

  try {
    const result = await pool.query(
      `INSERT INTO chapters (course_id, title, week_number, content_type, content_url, content_text, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.courseId, title, week_number || 1, content_type || 'text', content_url || null, content_text || null, position || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a chapter
router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, week_number, content_type, content_url, content_text, position } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM chapters WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Chapter not found' });
    const chapter = existing.rows[0];
    const owns = await assertOwnsCourse(chapter.course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    const result = await pool.query(
      `UPDATE chapters SET title = $1, week_number = $2, content_type = $3, content_url = $4, content_text = $5, position = $6
       WHERE id = $7 RETURNING *`,
      [title ?? chapter.title, week_number ?? chapter.week_number, content_type ?? chapter.content_type,
       content_url ?? chapter.content_url, content_text ?? chapter.content_text, position ?? chapter.position, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a chapter
router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM chapters WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Chapter not found' });
    const owns = await assertOwnsCourse(existing.rows[0].course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    await pool.query('DELETE FROM chapters WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark a chapter complete / record time spent (student)
router.post('/:id/progress', requireAuth, async (req, res) => {
  const { time_spent_seconds, completed } = req.body;
  try {
    await pool.query(
      `INSERT INTO chapter_progress (user_id, chapter_id, time_spent_seconds, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chapter_id) DO UPDATE SET
         time_spent_seconds = chapter_progress.time_spent_seconds + EXCLUDED.time_spent_seconds,
         completed_at = COALESCE(chapter_progress.completed_at, EXCLUDED.completed_at)`,
      [req.user.id, req.params.id, time_spent_seconds || 0, completed ? new Date() : null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// A student's completed chapters for a course (used to render progress in the course player)
router.get('/course/:courseId/progress', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.chapter_id, cp.completed_at, cp.time_spent_seconds
       FROM chapter_progress cp JOIN chapters c ON c.id = cp.chapter_id
       WHERE c.course_id = $1 AND cp.user_id = $2`,
      [req.params.courseId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
