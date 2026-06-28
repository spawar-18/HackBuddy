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
const {
  generateTaskPlan,
  regenerateTaskPlan,
  updateTaskStatus
} = require('../controller/taskPlanController');
const { checkProjectLimit } = require('../middleware/subscriptionGate');

// POST /api/project - Create a new project for a team
router.post('/', authMiddleware, checkProjectLimit, createProject);

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

// POST /api/project/:projectId/analyze - Analyze project feasibility using AI
router.post('/:projectId/analyze', authMiddleware, analyzeProject);

// POST /api/project/:projectId/generate-task-plan - Generate AI Task Plan
router.post('/:projectId/generate-task-plan', authMiddleware, generateTaskPlan);

// POST /api/project/:projectId/regenerate-task-plan - Regenerate AI Task Plan
router.post('/:projectId/regenerate-task-plan', authMiddleware, regenerateTaskPlan);

// PATCH /api/project/:projectId/task-plan/task-status - Update individual task status
router.patch('/:projectId/task-plan/task-status', authMiddleware, updateTaskStatus);

module.exports = router;
