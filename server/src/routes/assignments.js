const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

async function assertOwnsCourse(courseId, user) {
  const result = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (result.rows.length === 0) return { error: 'Course not found', status: 404 };
  const course = result.rows[0];
  if (user.role !== 'admin' && course.instructor_id !== user.id) {
    return { error: 'You do not own this course', status: 403 };
  }
  return { course };
}

// List assignments for a course
router.get('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM assignments WHERE course_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [req.params.courseId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create an assignment
router.post('/course/:courseId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, description, due_date, is_group_assignment, max_points, chapter_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const owns = await assertOwnsCourse(req.params.courseId, req.user);
  if (owns.error) return res.status(owns.status).json({ error: owns.error });

  try {
    const result = await pool.query(
      `INSERT INTO assignments (course_id, chapter_id, title, description, due_date, is_group_assignment, max_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.courseId, chapter_id || null, title, description || '', due_date || null,
       !!is_group_assignment, max_points || 100]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update an assignment
router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, description, due_date, is_group_assignment, max_points } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = existing.rows[0];
    const owns = await assertOwnsCourse(assignment.course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    const result = await pool.query(
      `UPDATE assignments SET title = $1, description = $2, due_date = $3, is_group_assignment = $4, max_points = $5
       WHERE id = $6 RETURNING *`,
      [title ?? assignment.title, description ?? assignment.description, due_date ?? assignment.due_date,
       is_group_assignment ?? assignment.is_group_assignment, max_points ?? assignment.max_points, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an assignment
router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const owns = await assertOwnsCourse(existing.rows[0].course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
