const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

// List all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user's role
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin, teacher, or student' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List courses pending approval
router.get('/courses/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name AS instructor_name, u.email AS instructor_email
      FROM courses c JOIN users u ON u.id = c.instructor_id
      WHERE c.status = 'pending_approval'
      ORDER BY c.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve a course
router.post('/courses/:id/approve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE courses SET status = 'published', rejection_reason = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject a course
router.post('/courses/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE courses SET status = 'rejected', rejection_reason = $1 WHERE id = $2 RETURNING *`,
      [reason || 'No reason given', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
