const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const TechStackProposal = require('../models/TechStackProposal');
const TechStackVote = require('../models/TechStackVote');
const TechStackAnalysis = require('../models/TechStackAnalysis');
const ProjectChat = require('../models/ProjectChat');
const { analyzeTechStackWithAI } = require('../services/aiService');

// Helper to compare user IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

// Helper for sending chat alerts
const sendChatNotification = async (projectId, userId, message) => {
  try {
    await ProjectChat.create({
      projectId,
      userId,
      role: 'assistant',
      message
    });
  } catch (error) {
    console.error('Failed to create ProjectChat notification:', error);
  }
};

/**
 * Propose a technology stack (Owner / Team Members)
 * @route   POST /api/projects/:projectId/tech-stack/proposal
 * @access  Private
 */
exports.proposeStack = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { frontend, backend, database, ai, deployment } = req.body;

    // Validation
    if (!frontend || !backend || !database || !ai || !deployment) {
      return res.status(400).json({ success: false, message: 'All technology fields are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Check membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // Create or update proposal
    let proposal = await TechStackProposal.findOne({ projectId });
    let isNew = false;
    if (!proposal) {
      isNew = true;
      proposal = new TechStackProposal({
        projectId,
        createdBy: req.user.id,
        frontend,
        backend,
        database,
        ai,
        deployment,
        status: 'Proposed'
      });
    } else {
      // If stack is modified, reset vote status and allow voting again
      proposal.frontend = frontend;
      proposal.backend = backend;
      proposal.database = database;
      proposal.ai = ai;
      proposal.deployment = deployment;
      proposal.status = 'Proposed';
      
      // Clear previous votes and analysis when stack is modified
      await TechStackVote.deleteMany({ projectId });
      await TechStackAnalysis.deleteMany({ projectId });
    }

    await proposal.save();

    // Reset final tech stack on project if modified
    project.finalTechStack = { frontend: '', backend: '', database: '', ai: '', deployment: '' };
    await project.save();

    const user = await User.findById(req.user.id);
    const actionText = isNew ? 'proposed a new tech stack' : 'modified the proposed tech stack';
    await sendChatNotification(
      projectId,
      req.user.id,
      `📢 [TECH STACK ALERT] ${user.name} has ${actionText}!\nFrontend: ${frontend}\nBackend: ${backend}\nDatabase: ${database}\nAI/ML: ${ai}\nDeployment: ${deployment}\nPrevious votes have been cleared. Cast your votes!`
    );

    res.status(200).json({ success: true, message: 'Tech stack proposed successfully', proposal });
  } catch (error) {
    console.error('proposeStack error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error proposing stack' });
  }
};

/**
 * Submit a vote on the proposed stack
 * @route   POST /api/projects/:projectId/tech-stack/vote
 * @access  Private
 */
exports.submitVote = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { voteType, confidenceScores, reason, suggestedAlternatives } = req.body;

    if (!voteType) {
      return res.status(400).json({ success: false, message: 'voteType is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const proposal = await TechStackProposal.findOne({ projectId });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'No proposed stack found to vote on' });
    }

    if (proposal.status === 'Finalized') {
      return res.status(400).json({ success: false, message: 'Voting is closed because the tech stack has already been finalized.' });
    }

    // Handle duplicate vote
    const existingVote = await TechStackVote.findOne({ projectId, userId: req.user.id });
    if (existingVote) {
      return res.status(400).json({ success: false, message: 'Duplicate Votes: You have already submitted a vote on this proposal.' });
    }

    // Check confidence scores are provided
    if (!confidenceScores || typeof confidenceScores !== 'object') {
      return res.status(400).json({ success: false, message: 'Missing Confidence Scores: Please provide ratings for all selected technologies.' });
    }

    const requiredKeys = ['frontend', 'backend', 'database', 'ai', 'deployment'];
    const missingKeys = requiredKeys.filter(key => !confidenceScores[key]);
    if (missingKeys.length > 0) {
      return res.status(400).json({ success: false, message: `Missing Confidence Scores: Please rate the technologies for: ${missingKeys.join(', ')}` });
    }

    // If vote is Reject or Approve With Concerns, reason must be provided
    if ((voteType === 'Reject' || voteType === 'Approve With Concerns') && (!reason || reason.trim() === '')) {
      return res.status(400).json({ success: false, message: `Reason is required for vote type: ${voteType}` });
    }

    const vote = await TechStackVote.create({
      projectId,
      userId: req.user.id,
      voteType,
      confidenceScores,
      reason: reason || '',
      suggestedAlternatives: suggestedAlternatives || {}
    });

    const user = await User.findById(req.user.id);
    await sendChatNotification(
      projectId,
      req.user.id,
      `📢 [TECH STACK ALERT] ${user.name} voted: "${voteType}" with confidence scores: Frontend (${confidenceScores.frontend}), Backend (${confidenceScores.backend}), Database (${confidenceScores.database}), AI (${confidenceScores.ai}), Deployment (${confidenceScores.deployment}).`
    );

    res.status(201).json({ success: true, message: 'Vote submitted successfully', vote });
  } catch (error) {
    console.error('submitVote error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error submitting vote' });
  }
};

/**
 * Add a category-specific comment/discussion
 * @route   POST /api/projects/:projectId/tech-stack/comment
 * @access  Private
 */
exports.addDiscussionComment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { category, comment } = req.body;

    if (!category || !comment) {
      return res.status(400).json({ success: false, message: 'category and comment are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const proposal = await TechStackProposal.findOne({ projectId });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'No proposed stack found' });
    }

    const user = await User.findById(req.user.id);
    proposal.discussions.push({
      category,
      userId: req.user.id,
      userName: user.name,
      comment
    });

    await proposal.save();

    res.status(200).json({ success: true, proposal });
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error adding comment' });
  }
};

/**
 * Analyze the Proposed Stack with AI
 * @route   POST /api/projects/:projectId/tech-stack/analyze
 * @access  Private
 */
exports.analyzeProposedStack = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills resumeUrl');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Check membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const proposal = await TechStackProposal.findOne({ projectId });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Please propose a tech stack before generating AI analysis' });
    }

    const votes = await TechStackVote.find({ projectId });
    if (votes.length === 0) {
      return res.status(400).json({ success: false, message: 'No votes have been cast yet. Please have team members vote first.' });
    }

    // Build context
    let teamContext = '';
    team.members.forEach(member => {
      const skillsStr = member.skills && member.skills.length > 0 ? member.skills.join(', ') : 'None';
      teamContext += `- ${member.name}: Skills: [${skillsStr}], Resume parsed: ${member.resumeUrl ? 'Yes' : 'No'}\n`;
    });

    // Populate user names in vote context for AI
    const populatedVotes = [];
    for (const vote of votes) {
      const voteUser = team.members.find(m => isSameUser(m._id, vote.userId)) || { name: 'Unknown Member' };
      populatedVotes.push({
        voter: voteUser.name,
        voteType: vote.voteType,
        confidenceScores: vote.confidenceScores instanceof Map ? Object.fromEntries(vote.confidenceScores) : vote.confidenceScores,
        reason: vote.reason,
        suggestedAlternatives: vote.suggestedAlternatives instanceof Map ? Object.fromEntries(vote.suggestedAlternatives) : vote.suggestedAlternatives
      });
    }

    const proposalContext = {
      proposal: {
        frontend: proposal.frontend,
        backend: proposal.backend,
        database: proposal.database,
        ai: proposal.ai,
        deployment: proposal.deployment
      },
      votes: populatedVotes,
      members: team.members.map(m => ({ name: m.name }))
    };

    const hackathonDuration = project.duration || '48 hours';
    const projectComplexity = `Problem: ${project.problemStatement}. Features: ${(project.featuresToBuild || []).join(', ')}`;

    // Call AI
    let analysisResult;
    try {
      analysisResult = await analyzeTechStackWithAI(proposalContext, teamContext, hackathonDuration, projectComplexity);
    } catch (aiError) {
      console.error('AI stack consensus error:', aiError);
      return res.status(502).json({ success: false, message: 'AI Timeout or Invalid AI Response. Please try again later.' });
    }

    // Save or update analysis
    await TechStackAnalysis.deleteMany({ projectId });
    const analysis = await TechStackAnalysis.create({
      projectId,
      ...analysisResult,
      generatedAt: new Date()
    });

    await sendChatNotification(
      projectId,
      req.user.id,
      `📢 [TECH STACK ALERT] AI Consensus analysis generated!\nReadiness Score: ${analysis.readinessScore}/100, Consensus Score: ${analysis.consensusScore}/100 (${analysis.consensusScore > 75 ? 'Strong Agreement' : (analysis.consensusScore > 50 ? 'Moderate Agreement' : 'High Disagreement')}).`
    );

    res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('analyzeProposedStack error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error analyzing stack' });
  }
};

/**
 * Finalize the Tech Stack (Owner Only)
 * @route   POST /api/projects/:projectId/tech-stack/finalize
 * @access  Private
 */
exports.finalizeStack = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { action, modifiedStack } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'action is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Only project/team owner can finalize
    const isOwner = isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only the project owner can finalize the technology stack.' });
    }

    const proposal = await TechStackProposal.findOne({ projectId });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'No proposed stack found to finalize' });
    }

    if (action === 'ACCEPT_RECOMMENDATION') {
      const analysis = await TechStackAnalysis.findOne({ projectId });
      if (!analysis) {
        return res.status(400).json({ success: false, message: 'Please generate an AI Stack Analysis before accepting recommendation.' });
      }

      // Convert recommendation stack arrays to values
      const rec = analysis.recommendedStack;
      project.finalTechStack = {
        frontend: Array.isArray(rec.frontend) && rec.frontend[0] ? rec.frontend[0] : (typeof rec.frontend === 'string' ? rec.frontend : proposal.frontend),
        backend: Array.isArray(rec.backend) && rec.backend[0] ? rec.backend[0] : (typeof rec.backend === 'string' ? rec.backend : proposal.backend),
        database: Array.isArray(rec.database) && rec.database[0] ? rec.database[0] : (typeof rec.database === 'string' ? rec.database : proposal.database),
        ai: Array.isArray(rec.ai) && rec.ai[0] ? rec.ai[0] : (typeof rec.ai === 'string' ? rec.ai : proposal.ai),
        deployment: Array.isArray(rec.deployment) && rec.deployment[0] ? rec.deployment[0] : (typeof rec.deployment === 'string' ? rec.deployment : proposal.deployment)
      };
      
      proposal.status = 'Finalized';
      await proposal.save();
      await project.save();

      await sendChatNotification(
        projectId,
        req.user.id,
        `📢 [TECH STACK ALERT] The project owner accepted the AI Recommendation stack!\nFinalized Stack: Frontend (${project.finalTechStack.frontend}), Backend (${project.finalTechStack.backend}), Database (${project.finalTechStack.database}), AI (${project.finalTechStack.ai}), Deployment (${project.finalTechStack.deployment}).`
      );

    } else if (action === 'KEEP_ORIGINAL') {
      project.finalTechStack = {
        frontend: proposal.frontend,
        backend: proposal.backend,
        database: proposal.database,
        ai: proposal.ai,
        deployment: proposal.deployment
      };
      
      proposal.status = 'Finalized';
      await proposal.save();
      await project.save();

      await sendChatNotification(
        projectId,
        req.user.id,
        `📢 [TECH STACK ALERT] The project owner finalized the original proposed stack!\nFinalized Stack: Frontend (${project.finalTechStack.frontend}), Backend (${project.finalTechStack.backend}), Database (${project.finalTechStack.database}), AI (${project.finalTechStack.ai}), Deployment (${project.finalTechStack.deployment}).`
      );

    } else if (action === 'MODIFY') {
      if (!modifiedStack || typeof modifiedStack !== 'object') {
        return res.status(400).json({ success: false, message: 'modifiedStack object is required for MODIFY action' });
      }
      const { frontend, backend, database, ai, deployment } = modifiedStack;
      if (!frontend || !backend || !database || !ai || !deployment) {
        return res.status(400).json({ success: false, message: 'All technology fields are required in modifiedStack' });
      }

      project.finalTechStack = { frontend, backend, database, ai, deployment };
      
      proposal.frontend = frontend;
      proposal.backend = backend;
      proposal.database = database;
      proposal.ai = ai;
      proposal.deployment = deployment;
      proposal.status = 'Finalized';

      await proposal.save();
      await project.save();

      await sendChatNotification(
        projectId,
        req.user.id,
        `📢 [TECH STACK ALERT] The project owner modified and finalized the stack!\nFinalized Stack: Frontend (${frontend}), Backend (${backend}), Database (${database}), AI (${ai}), Deployment (${deployment}).`
      );

    } else if (action === 'RESTART_VOTING') {
      proposal.status = 'Proposed';
      await proposal.save();

      // Clear votes and analysis
      await TechStackVote.deleteMany({ projectId });
      await TechStackAnalysis.deleteMany({ projectId });

      project.finalTechStack = { frontend: '', backend: '', database: '', ai: '', deployment: '' };
      await project.save();

      await sendChatNotification(
        projectId,
        req.user.id,
        `📢 [TECH STACK ALERT] The project owner restarted voting. Previous votes and analysis have been cleared. Cast your votes on the stack!`
      );

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action type' });
    }

    res.status(200).json({ success: true, finalTechStack: project.finalTechStack, proposalStatus: proposal.status });
  } catch (error) {
    console.error('finalizeStack error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error finalising stack' });
  }
};

/**
 * Get all Stack Consensus Details (Proposal, Votes, Analysis)
 * @route   GET /api/projects/:projectId/tech-stack
 * @access  Private
 */
exports.getTechStackDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const proposal = await TechStackProposal.findOne({ projectId });
    const votes = await TechStackVote.find({ projectId });
    const analysis = await TechStackAnalysis.findOne({ projectId });

    // Populate usernames in votes list
    const populatedVotes = [];
    const populatedMembers = await User.find({ _id: { $in: team.members } }).select('name avatar');
    
    votes.forEach(vote => {
      const voteUser = populatedMembers.find(m => isSameUser(m._id, vote.userId)) || { name: 'Unknown' };
      populatedVotes.push({
        _id: vote._id,
        userId: vote.userId,
        userName: voteUser.name,
        avatar: voteUser.avatar,
        voteType: vote.voteType,
        confidenceScores: vote.confidenceScores,
        reason: vote.reason,
        suggestedAlternatives: vote.suggestedAlternatives,
        createdAt: vote.createdAt
      });
    });

    res.status(200).json({
      success: true,
      proposal,
      votes: populatedVotes,
      analysis,
      finalTechStack: project.finalTechStack,
      isOwner: isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id)
    });
  } catch (error) {
    console.error('getTechStackDetails error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching stack details' });
  }
};
