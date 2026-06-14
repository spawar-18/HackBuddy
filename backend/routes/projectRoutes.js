const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createProject,
  getProjectByTeam,
  getProject,
  updateProject,
  deleteProject
} = require('../controller/projectController');

// POST /api/project - Create a new project for a team
router.post('/', authMiddleware, createProject);

// GET /api/project/team/:teamId - Get project details for a team
router.get('/team/:teamId', authMiddleware, getProjectByTeam);

// GET /api/project/:projectId - Get project details by project ID
router.get('/:projectId', authMiddleware, getProject);

// PUT /api/project/:projectId - Update project details
router.put('/:projectId', authMiddleware, updateProject);

// DELETE /api/project/:projectId - Delete project
router.delete('/:projectId', authMiddleware, deleteProject);

module.exports = router;
