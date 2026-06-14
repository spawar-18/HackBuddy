const Team = require('../models/Team');
const { analyzeTeamWithAI } = require('../services/aiService');

/**
 * Controller to fetch existing cached team analysis
 * @desc    Get cached AI-powered team analysis
 * @route   GET /api/team/:teamId/analysis
 * @access  Private
 */
const getAnalysis = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify if the user is a member of the team
    const isMember = team.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === req.user.id;
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    return res.status(200).json({
      success: true,
      analysis: team.analysis || null,
      analysisGeneratedAt: team.analysisGeneratedAt || null,
      analysisVersion: team.analysisVersion || 0
    });
  } catch (error) {
    console.error('getAnalysis error:', error);
    return res.status(500).json({ message: 'Server error occurred while fetching analysis' });
  }
};

/**
 * Controller to handle AI team analysis request
 * @desc    Generate AI-powered analysis for a team (cached)
 * @route   POST /api/team/:teamId/analyze
 * @access  Private
 */
const analyzeTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // 1. Fetch Team by teamId and populate members
    const team = await Team.findById(teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // 2. Verify if the user is a member of the team
    const isMember = team.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === req.user.id;
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    // 3. Return cached analysis if it exists
    if (team.analysis && team.analysisGeneratedAt) {
      console.log('Returning cached team analysis');
      return res.status(200).json({
        success: true,
        analysis: team.analysis,
        analysisGeneratedAt: team.analysisGeneratedAt,
        analysisVersion: team.analysisVersion || 0
      });
    }

    // 4. Verify if team is empty
    if (!team.members || team.members.length === 0) {
      return res.status(400).json({ message: 'Team has no members. Add members before performing analysis.' });
    }

    // 5. Build team context string
    let teamDataString = `Team Name: ${team.teamName}\n\nMembers:\n`;
    team.members.forEach(member => {
      const skillsStr = (member.skills && member.skills.length > 0)
        ? member.skills.join(', ')
        : 'None';
      teamDataString += `\n${member.name}\nSkills:\n${skillsStr}\n`;
    });

    // 6. Send context to Qwen/Qwen3.6-35B-A3B and get structured analysis
    let analysisResult;
    try {
      analysisResult = await analyzeTeamWithAI(teamDataString);
    } catch (aiError) {
      console.error('AI team analysis execution error:', aiError);
      return res.status(502).json({
        message: aiError.message && aiError.message.includes('JSON')
          ? 'Failed to parse AI response. The generated report format was invalid.'
          : 'AI API failure: Failed to analyze team skills. Please try again later.',
        error: aiError.message
      });
    }

    // 7. Save analysis to team document
    team.analysis = analysisResult;
    team.analysisGeneratedAt = new Date();
    await team.save();

    // 8. Return saved analysis JSON response
    return res.status(200).json({
      success: true,
      analysis: team.analysis,
      analysisGeneratedAt: team.analysisGeneratedAt,
      analysisVersion: team.analysisVersion || 0
    });

  } catch (error) {
    console.error('analyzeTeam error:', error);
    return res.status(500).json({ message: 'Server error occurred during team analysis' });
  }
};

/**
 * Controller to handle deterministic team analysis regeneration request
 * @desc    Force regenerate AI-powered analysis for a team (bypassing cache)
 * @route   POST /api/team/:teamId/regenerate-analysis
 * @access  Private
 */
const regenerateAnalysis = async (req, res) => {
  try {
    const { teamId } = req.params;

    // 1. Fetch Team by teamId and populate members
    const team = await Team.findById(teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // 2. Verify if the user is a member of the team
    const isMember = team.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === req.user.id;
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    // 3. Verify if team is empty
    if (!team.members || team.members.length === 0) {
      return res.status(400).json({ message: 'Team has no members. Add members before performing analysis.' });
    }

    // 4. Build team context string
    let teamDataString = `Team Name: ${team.teamName}\n\nMembers:\n`;
    team.members.forEach(member => {
      const skillsStr = (member.skills && member.skills.length > 0)
        ? member.skills.join(', ')
        : 'None';
      teamDataString += `\n${member.name}\nSkills:\n${skillsStr}\n`;
    });

    // 5. Call AI again (ignoring cache)
    let analysisResult;
    try {
      analysisResult = await analyzeTeamWithAI(teamDataString);
    } catch (aiError) {
      console.error('AI team analysis regeneration execution error:', aiError);
      return res.status(502).json({
        message: aiError.message && aiError.message.includes('JSON')
          ? 'Failed to parse AI response. The generated report format was invalid.'
          : 'AI API failure: Failed to analyze team skills. Please try again later.',
        error: aiError.message
      });
    }

    // 6. Overwrite saved analysis and update timestamp
    team.analysis = analysisResult;
    team.analysisGeneratedAt = new Date();
    await team.save();

    // 7. Return updated analysis JSON response
    return res.status(200).json({
      success: true,
      analysis: team.analysis,
      analysisGeneratedAt: team.analysisGeneratedAt,
      analysisVersion: team.analysisVersion || 0
    });

  } catch (error) {
    console.error('regenerateAnalysis error:', error);
    return res.status(500).json({ message: 'Server error occurred during team analysis regeneration' });
  }
};

module.exports = {
  getAnalysis,
  analyzeTeam,
  regenerateAnalysis
};
