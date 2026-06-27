const Project = require('../models/Project');
const Team = require('../models/Team');
const ProjectChat = require('../models/ProjectChat');
const SmartContextBuilder = require('../services/ai/SmartContextBuilder');
const MemoryManager = require('../services/ai/MemoryManager');
const { chatWithMentorAI } = require('../services/aiService');

const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

exports.getChatHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some((member) => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // Retrieve persistent conversation memory
    const memory = await MemoryManager.getMemory(projectId);

    // Retrieve last 20 messages in chronological order (newest first, then reversed)
    const rawMessages = await ProjectChat.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    const messages = rawMessages.reverse();

    const contextPreview = await SmartContextBuilder.buildContext(projectId, 'project overview');

    res.status(200).json({
      success: true,
      messages,
      projectContext: {
        projectName: project.projectName,
        features: project.featuresToBuild || [],
        techStack: project.finalTechStack || {},
        hasReview: Boolean(project.projectReview),
        topic: contextPreview.topic,
        conversationId: memory?.conversationId || `${projectId}_${Date.now()}`,
        summary: memory?.summary || '',
        currentFeature: memory?.currentFeature || (project.featuresToBuild?.[0] || 'Core MVP'),
        currentImplementation: memory?.currentImplementation || '',
        currentDebuggingSession: memory?.currentDebuggingSession || '',
        currentApis: memory?.currentApis || [],
        currentDeploymentIssue: memory?.currentDeploymentIssue || '',
        currentBlockers: memory?.currentBlockers || []
      }
    });
  } catch (error) {
    console.error('getChatHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some((member) => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    if (!project.projectReview) {
      return res.status(400).json({
        success: false,
        message: 'No project review found. Please generate an AI Project Review before starting a chat with the mentor.'
      });
    }

    // 1. Get or create persistent conversation memory
    const memory = await MemoryManager.getMemory(projectId);
    
    let conversationId = memory.conversationId;
    if (!conversationId) {
      conversationId = `${projectId}_${Date.now()}`;
      memory.conversationId = conversationId;
      await memory.save();
    }

    // Store active userId
    memory.userId = req.user.id;
    await memory.save();

    // 2. Fetch last 20 messages for history (chronological order)
    const rawHistory = await ProjectChat.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(20);

    const history = rawHistory.reverse().map((entry) => ({
      role: entry.role,
      message: entry.message
    }));

    console.log(`Running AI Mentor V2 query for project: ${project.projectName}...`);
    
    // Call chatWithMentorAI passing session metadata
    const mentorResponse = await chatWithMentorAI({
      projectId,
      history,
      question: message.trim(),
      conversationId,
      userId: req.user.id
    });

    const answerText = typeof mentorResponse === 'string'
      ? mentorResponse
      : mentorResponse.answer;

    // 3. Save user message to database
    const userMsg = await ProjectChat.create({
      projectId,
      userId: req.user.id,
      role: 'user',
      message: message.trim()
    });

    // 4. Save assistant message with metadata
    const assistantMsg = await ProjectChat.create({
      projectId,
      userId: req.user.id,
      role: 'assistant',
      message: answerText.trim(),
      metadata: typeof mentorResponse === 'object' ? {
        confidence: mentorResponse.confidence,
        provider: mentorResponse.provider,
        topic: mentorResponse.topic,
        contextSections: mentorResponse.contextSections,
        recommendations: mentorResponse.recommendations,
        followUpActions: mentorResponse.followUpActions,
        relatedTasks: mentorResponse.relatedTasks,
        latencyMs: mentorResponse.latencyMs,
        promptVersion: mentorResponse.promptVersion
      } : undefined
    });

    // 5. Update active conversation messages array in memory
    const updatedRawMsgs = await ProjectChat.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    memory.messages = updatedRawMsgs.reverse().map(m => ({
      role: m.role,
      content: m.message,
      createdAt: m.createdAt
    }));
    await memory.save();

    // 6. Merge memoryUpdates
    if (typeof mentorResponse === 'object' && mentorResponse.memoryUpdates) {
      const mu = mentorResponse.memoryUpdates;
      
      if (Array.isArray(mu.architectureDecisions)) {
        memory.architectureDecisions = Array.from(new Set([...(memory.architectureDecisions || []), ...mu.architectureDecisions]));
      }
      if (Array.isArray(mu.techStackDecisions)) {
        memory.techStackDecisions = Array.from(new Set([...(memory.techStackDecisions || []), ...mu.techStackDecisions]));
      }
      if (Array.isArray(mu.projectMilestones)) {
        memory.projectMilestones = Array.from(new Set([...(memory.projectMilestones || []), ...mu.projectMilestones]));
      }
      if (mu.currentSprint) memory.currentSprint = mu.currentSprint;
      if (mu.hackathonStage) memory.hackathonStage = mu.hackathonStage;
      if (mu.githubStatus) memory.githubStatus = mu.githubStatus;

      if (mu.currentImplementation) memory.currentImplementation = mu.currentImplementation;
      if (mu.currentDebuggingSession) memory.currentDebuggingSession = mu.currentDebuggingSession;
      if (mu.currentFeature) memory.currentFeature = mu.currentFeature;
      if (mu.currentDeploymentIssue) memory.currentDeploymentIssue = mu.currentDeploymentIssue;

      if (Array.isArray(mu.currentBlockers)) {
        memory.currentBlockers = mu.currentBlockers;
      }
      if (Array.isArray(mu.currentApis)) {
        memory.currentApis = Array.from(new Set([...(memory.currentApis || []), ...mu.currentApis]));
      }
      if (Array.isArray(mu.recentRecommendations || mu.previousAiAdvice)) {
        const advice = mu.recentRecommendations || mu.previousAiAdvice;
        memory.previousAiAdvice = Array.from(new Set([...(memory.previousAiAdvice || []), ...advice]));
      }

      memory.lastUpdated = new Date();
      await memory.save();
    }

    // 7. Auto-summarize older messages in background
    try {
      const totalMessages = await ProjectChat.countDocuments({ projectId });
      if (totalMessages > 20) {
        const olderMessages = await ProjectChat.find({ projectId })
          .sort({ createdAt: 1 })
          .limit(totalMessages - 20);

        if (olderMessages.length > 0) {
          const ConversationSummarizer = require('../services/ai/ConversationSummarizer');
          const summaryText = await ConversationSummarizer.summarize(olderMessages);
          if (summaryText) {
            memory.summary = summaryText;
            await memory.save();
            console.log(`[chatController] Updated memory summary for project ${projectId}`);
          }
        }
      }
    } catch (sumErr) {
      console.warn('[chatController] Auto-summarize background failed:', sumErr.message);
    }

    res.status(200).json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      mentor: typeof mentorResponse === 'object' ? mentorResponse : { answer: answerText }
    });
  } catch (error) {
    console.error('sendChatMessage error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during chat query' });
  }
};
