const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Submit an assignment (individual or, if the student's group is passed, group submission)
router.post('/:assignmentId', requireAuth, async (req, res) => {
  const { content_text, file_url, group_id } = req.body;
  try {
    const assignment = await pool.query('SELECT * FROM assignments WHERE id = $1', [req.params.assignmentId]);
    if (assignment.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const a = assignment.rows[0];

    if (a.is_group_assignment) {
      if (!group_id) return res.status(400).json({ error: 'group_id is required for a group assignment' });
      const membership = await pool.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [group_id, req.user.id]
      );
      if (membership.rows.length === 0) return res.status(403).json({ error: 'You are not a member of that group' });

      const result = await pool.query(
        `INSERT INTO submissions (assignment_id, group_id, content_text, file_url)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.assignmentId, group_id, content_text || null, file_url || null]
      );
      return res.status(201).json(result.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, user_id, content_text, file_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.assignmentId, req.user.id, content_text || null, file_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List submissions for an assignment (teacher/admin grading view)
router.get('/assignment/:assignmentId', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name AS student_name, g.name AS group_name,
             gr.score, gr.feedback, gr.graded_at
      FROM submissions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN groups g ON g.id = s.group_id
      LEFT JOIN grades gr ON gr.submission_id = s.id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [req.params.assignmentId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// A student's own submissions for an assignment
router.get('/assignment/:assignmentId/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, gr.score, gr.feedback, gr.graded_at
      FROM submissions s
      LEFT JOIN grades gr ON gr.submission_id = s.id
      WHERE s.assignment_id = $1
        AND (s.user_id = $2 OR s.group_id IN (SELECT group_id FROM group_members WHERE user_id = $2))
      ORDER BY s.submitted_at DESC
    `, [req.params.assignmentId, req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grade a submission
router.post('/:submissionId/grade', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  const { score, feedback } = req.body;
  if (score === undefined || score === null) return res.status(400).json({ error: 'score is required' });
  try {
    const result = await pool.query(
      `INSERT INTO grades (submission_id, score, feedback, graded_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (submission_id) DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback,
         graded_by = EXCLUDED.graded_by, graded_at = now()
       RETURNING *`,
      [req.params.submissionId, score, feedback || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
