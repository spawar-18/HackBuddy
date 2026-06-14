const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { 
  getAnalysis, 
  analyzeTeam, 
  regenerateAnalysis 
} = require('../controller/teamAnalysisController');

// GET /api/team/:teamId/analysis
// Protected Route. Retrieves cached team analysis.
router.get('/:teamId/analysis', authMiddleware, getAnalysis);

// POST /api/team/:teamId/analyze
// Protected Route. Generates team analysis using AI (uses cached if exists).
router.post('/:teamId/analyze', authMiddleware, analyzeTeam);

// POST /api/team/:teamId/regenerate-analysis
// Protected Route. Forces AI regeneration of team analysis (bypasses cache).
router.post('/:teamId/regenerate-analysis', authMiddleware, regenerateAnalysis);

module.exports = router;
