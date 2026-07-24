const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

// Get all published courses (public catalog)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.description, c.price, c.thumbnail_url, c.status,
             u.name AS instructor_name,
             COUNT(l.id) AS lesson_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE c.status = 'published'
      GROUP BY c.id, u.name
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Courses belonging to the logged-in teacher (any status)
router.get('/mine', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(DISTINCT ch.id) AS chapter_count, COUNT(DISTINCT e.id) AS student_count
      FROM courses c
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.instructor_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new course (starts as draft)
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, description, price, thumbnail_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, price, thumbnail_url, instructor_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [title, description || '', price || 0, thumbnail_url || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single course with lessons + chapters (public, but drafts only visible to owner/admin)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await pool.query(`
      SELECT c.*, u.name AS instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `, [req.params.id]);

    if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    const courseRow = course.rows[0];

    const isOwner = req.user && req.user.id === courseRow.instructor_id;
    const isAdmin = req.user && req.user.role === 'admin';
    if (courseRow.status !== 'published' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'This course is not published yet' });
    }

    const lessons = await pool.query(
      `SELECT id, title, video_url, position FROM lessons WHERE course_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    const chapters = await pool.query(
      `SELECT id, title, week_number, content_type, content_url, content_text, position
       FROM chapters WHERE course_id = $1 ORDER BY week_number ASC, position ASC`,
      [req.params.id]
    );

    res.json({ ...courseRow, lessons: lessons.rows, chapters: chapters.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a course (owner teacher or admin). Teachers editing a published course get bumped back to pending_approval.
router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { title, description, price, thumbnail_url } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    const course = existing.rows[0];
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const nextStatus = req.user.role === 'admin'
      ? course.status
      : (course.status === 'published' ? 'pending_approval' : course.status);

    const result = await pool.query(
      `UPDATE courses SET title = $1, description = $2, price = $3, thumbnail_url = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [title ?? course.title, description ?? course.description, price ?? course.price,
       thumbnail_url ?? course.thumbnail_url, nextStatus, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Teacher submits a draft/rejected course for admin approval
router.post('/:id/submit', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    const course = existing.rows[0];
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }
    if (!['draft', 'rejected'].includes(course.status)) {
      return res.status(400).json({ error: `Cannot submit a course with status "${course.status}"` });
    }
    const result = await pool.query(
      `UPDATE courses SET status = 'pending_approval', rejection_reason = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Students enrolled in a course (teacher/admin only — used for group assignment)
router.get('/:id/students', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    if (req.user.role !== 'admin' && course.rows[0].instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, e.enrolled_at
      FROM enrollments e JOIN users u ON u.id = e.user_id
      WHERE e.course_id = $1 ORDER BY u.name ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
