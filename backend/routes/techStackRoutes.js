const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const {
  proposeStack,
  submitVote,
  addDiscussionComment,
  analyzeProposedStack,
  finalizeStack,
  getTechStackDetails
} = require('../controller/techStackController');

// All tech-stack routes are private and require authorization
router.post('/proposal', authMiddleware, proposeStack);
router.post('/vote', authMiddleware, submitVote);
router.post('/comment', authMiddleware, addDiscussionComment);
router.post('/analyze', authMiddleware, analyzeProposedStack);
router.post('/finalize', authMiddleware, finalizeStack);
router.get('/', authMiddleware, getTechStackDetails);

module.exports = router;
