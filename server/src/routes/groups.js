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

// List groups (with members) for a course
router.get('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const groups = await pool.query('SELECT * FROM groups WHERE course_id = $1 ORDER BY created_at ASC', [req.params.courseId]);
    const members = await pool.query(
      `SELECT gm.group_id, gm.role, u.id AS user_id, u.name, u.email
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ANY($1::int[])`,
      [groups.rows.map(g => g.id)]
    );
    const result = groups.rows.map(g => ({
      ...g,
      members: members.rows.filter(m => m.group_id === g.id)
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a group (teacher/admin)
router.post('/course/:courseId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  const owns = await assertOwnsCourse(req.params.courseId, req.user);
  if (owns.error) return res.status(owns.status).json({ error: owns.error });

  try {
    const result = await pool.query(
      'INSERT INTO groups (course_id, name) VALUES ($1, $2) RETURNING *',
      [req.params.courseId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a member to a group (teacher/admin assigns; must be an enrolled student)
router.post('/:groupId/members', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.groupId]);
    if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const owns = await assertOwnsCourse(group.rows[0].course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    const enrolled = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [user_id, group.rows[0].course_id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(400).json({ error: 'That student is not enrolled in this course' });
    }

    const result = await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role RETURNING *`,
      [req.params.groupId, user_id, role === 'leader' ? 'leader' : 'member']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a member from a group
router.delete('/:groupId/members/:userId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.groupId]);
    if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const owns = await assertOwnsCourse(group.rows[0].course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.groupId, req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a group
router.delete('/:groupId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.groupId]);
    if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const owns = await assertOwnsCourse(group.rows[0].course_id, req.user);
    if (owns.error) return res.status(owns.status).json({ error: owns.error });

    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.groupId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
