const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createProject,
  getProjectByTeam,
  getProject,
  updateProject,
  deleteProject,
  analyzeProject
} = require('../controller/projectController');

// POST /api/project - Create a new project for a team
router.post('/', authMiddleware, createProject);

// GET /api/project/team/:teamId - Get project details for a team
router.get('/team/:teamId', authMiddleware, getProjectByTeam);

// GET /api/project/:projectId - Get project details by project ID
router.get('/:projectId', authMiddleware, getProject);

// PUT /api/project/:projectId - Update project details
router.put('/:projectId', authMiddleware, updateProject);

// PATCH /api/project/:projectId - Update project details
router.patch('/:projectId', authMiddleware, updateProject);

// DELETE /api/project/:projectId - Delete project
router.delete('/:projectId', authMiddleware, deleteProject);

// POST /api/project/:projectId/analyze - Analyze project feasibility using Qwen AI
router.post('/:projectId/analyze', authMiddleware, analyzeProject);

module.exports = router;
