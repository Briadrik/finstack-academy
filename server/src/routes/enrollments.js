const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth: auth } = require('../middleware/auth');

router.post('/:courseId', auth, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;
  try {
    await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, courseId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/mine', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.title, c.description,
        COUNT(DISTINCT l.id) AS total_lessons,
        COUNT(DISTINCT p.lesson_id) AS completed_lessons
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = $1
      WHERE e.user_id = $1
      GROUP BY c.id
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/progress/:courseId', auth, async (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.lesson_id FROM progress p
      JOIN lessons l ON l.id = p.lesson_id
      WHERE p.user_id = $1 AND l.course_id = $2
    `, [userId, courseId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/progress/:lessonId', auth, async (req, res) => {
  const userId = req.user.id;
  const { lessonId } = req.params;
  try {
    await pool.query(
      'INSERT INTO progress (user_id, lesson_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, lessonId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
