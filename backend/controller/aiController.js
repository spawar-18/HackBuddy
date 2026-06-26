const AIEngine = require('../services/ai/AIEngine');
const Project = require('../models/Project');
const Team = require('../models/Team');

// Helper to compare user IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

/**
 * Executes a centralized AI request.
 * @desc    Single entry point endpoint for all frontend AI operations
 * @route   POST /api/ai/execute
 * @access  Private
 */
const execute = async (req, res) => {
  try {
    const { projectId, module, userInput } = req.body;

    if (!module) {
      return res.status(400).json({ success: false, message: 'Module parameter is required.' });
    }

    // Auth & Authz validation if projectId is supplied
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      const team = await Team.findById(project.teamId);
      if (team) {
        const isMember = team.members.some(member => isSameUser(member, req.user.id));
        if (!isMember) {
          return res.status(403).json({ success: false, message: 'Access denied: You are not a member of the linked team.' });
        }
      }
    }

    console.log(`[aiController] Handling execution for module: ${module}`);
    const result = await AIEngine.executeAI({
      projectId,
      module,
      userInput,
      bypassCache: req.body.bypassCache || false,
      history: req.body.history || [],
      members: req.body.members || []
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('aiController.execute error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during AI execution.'
    });
  }
};

/**
 * Retrieves the current AI engine analytics.
 * @desc    Fetch performance metrics of AI Engine
 * @route   GET /api/ai/analytics
 * @access  Private
 */
const getAnalytics = async (req, res) => {
  try {
    const analytics = AIEngine.getAnalyticsSummary();
    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('aiController.getAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving analytics.'
    });
  }
};

module.exports = {
  execute,
  getAnalytics
};
