const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const ProjectChat = require('../models/ProjectChat');
const { chatWithMentorAI } = require('../services/aiService');

// Helper to compare user IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

// @desc    Get previous chat messages for a project
// @route   GET /api/project/:projectId/chat
// @access  Private
exports.getChatHistory = async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1. Fetch Project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 2. Fetch Team and verify membership
    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // 3. Fetch last 20 messages sorted by createdAt ascending
    const messages = await ProjectChat.find({ projectId })
      .sort({ createdAt: 1 })
      .limit(20);

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('getChatHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

// @desc    Send a message to AI Mentor
// @route   POST /api/project/:projectId/chat
// @access  Private
exports.sendChatMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // 1. Fetch Project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 2. Fetch Team and verify membership
    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // 3. Verify AI Project Review exists
    if (!project.projectReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'No project review found. Please generate an AI Project Review before starting a chat with the mentor.' 
      });
    }

    // 4. Fetch previous chat history (last 20 messages)
    const rawHistory = await ProjectChat.find({ projectId })
      .sort({ createdAt: 1 })
      .limit(20);

    const history = rawHistory.map(h => ({
      role: h.role,
      message: h.message
    }));

    // 5. Build Project Context String
    let contextString = `Project Name: ${project.projectName}
Track: ${project.track || 'Not specified'}
Duration: ${project.duration || 'Not specified'}
Problem Statement: ${project.problemStatement}
Description: ${project.description || 'Not specified'}
Features to Build:
${project.featuresToBuild.map(f => `- ${f}`).join('\n')}

Team Members and Skills:
`;

    team.members.forEach(member => {
      const skillsStr = member.skills && member.skills.length > 0 ? member.skills.join(', ') : 'None configured';
      contextString += `${member.name} (Skills: ${skillsStr})\n`;
    });

    contextString += `\nLatest Project Review:
Feasibility Score: ${project.projectReview.feasibilityScore}/10
Problem-Solution Alignment: ${project.projectReview.problemSolutionAlignment}
Project Risks:
${project.projectReview.projectRisks.map(r => `- ${r}`).join('\n')}
Missing Skills:
${project.projectReview.missingSkills.map(s => `- ${s}`).join('\n')}
Must Build Features:
${project.projectReview.mustBuildFeatures.map(f => `- ${f}`).join('\n')}
Optional Features:
${project.projectReview.optionalFeatures.map(f => `- ${f}`).join('\n')}
Features To Remove:
${project.projectReview.featuresToRemove.map(f => `- ${f}`).join('\n')}
Improvement Suggestions:
${project.projectReview.improvementSuggestions.map(s => `- ${s}`).join('\n')}
Judge Perspective: ${project.projectReview.judgePerspective}
Execution Strategy:
${project.projectReview.executionStrategy.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}
`;

    // 6. Call AI Chat Mentor Service
    console.log(`Running AI Mentor Chat query for project: ${project.projectName}...`);
    const reply = await chatWithMentorAI(contextString, history, message.trim());

    // 7. Save user message in DB
    const userMsg = await ProjectChat.create({
      projectId,
      userId: req.user.id,
      role: 'user',
      message: message.trim()
    });

    // 8. Save assistant message in DB
    const assistantMsg = await ProjectChat.create({
      projectId,
      userId: req.user.id,
      role: 'assistant',
      message: reply.trim()
    });

    res.status(200).json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg
    });
  } catch (error) {
    console.error('sendChatMessage error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during chat query' });
  }
};
