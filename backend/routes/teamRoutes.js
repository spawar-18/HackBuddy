const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createTeam,
  joinTeam,
  getMyTeams,
  getTeamDetails,
  leaveTeam,
  removeMember,
  transferOwnership,
  deleteTeam
} = require('../controller/teamController');

const { checkTeamLimit } = require('../middleware/subscriptionGate');

// All routes require JWT authentication
router.post('/create', authMiddleware, checkTeamLimit, createTeam);
router.post('/join', authMiddleware, joinTeam);
router.get('/my-teams', authMiddleware, getMyTeams);
router.get('/:teamId', authMiddleware, getTeamDetails);

// Leave Team
router.delete('/:teamId/leave', authMiddleware, leaveTeam);

// Remove Member
router.delete('/:teamId/member/:memberId', authMiddleware, removeMember);

// Transfer Ownership
router.patch('/:teamId/transfer-owner', authMiddleware, transferOwnership);

// Delete Team
router.delete('/:teamId', authMiddleware, deleteTeam);

module.exports = router;
