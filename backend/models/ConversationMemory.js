const mongoose = require('mongoose');

const conversationMemorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  conversationId: {
    type: String,
    default: ''
  },
  messages: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  currentImplementation: {
    type: String,
    default: ''
  },
  currentDebuggingSession: {
    type: String,
    default: ''
  },
  currentFeature: {
    type: String,
    default: ''
  },
  currentApis: {
    type: [String],
    default: []
  },
  currentDeploymentIssue: {
    type: String,
    default: ''
  },
  architectureDecisions: {
    type: [String],
    default: []
  },
  techStackDecisions: {
    type: [String],
    default: []
  },
  projectMilestones: {
    type: [String],
    default: []
  },
  previousAiAdvice: {
    type: [String],
    default: []
  },
  currentBlockers: {
    type: [String],
    default: []
  },
  completedTasks: {
    type: [String],
    default: []
  },
  recentRecommendations: {
    type: [String],
    default: []
  },
  currentSprint: {
    type: String,
    default: ''
  },
  hackathonStage: {
    type: String,
    default: ''
  },
  githubStatus: {
    type: String,
    default: ''
  },
  importantDiscussions: {
    type: [String],
    default: []
  },
  summary: {
    type: String,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const MongoConversationMemory = mongoose.model('ConversationMemory', conversationMemorySchema);

// In-Memory Database Fallback for local testing
const memoryDB = [];

const createMockMemoryInstance = (data) => {
  return {
    _id: data._id || 'mock_mem_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    userId: data.userId || null,
    conversationId: data.conversationId || '',
    messages: data.messages || [],
    currentImplementation: data.currentImplementation || '',
    currentDebuggingSession: data.currentDebuggingSession || '',
    currentFeature: data.currentFeature || '',
    currentApis: data.currentApis || [],
    currentDeploymentIssue: data.currentDeploymentIssue || '',
    architectureDecisions: data.architectureDecisions || [],
    techStackDecisions: data.techStackDecisions || [],
    projectMilestones: data.projectMilestones || [],
    previousAiAdvice: data.previousAiAdvice || [],
    currentBlockers: data.currentBlockers || [],
    completedTasks: data.completedTasks || [],
    recentRecommendations: data.recentRecommendations || [],
    currentSprint: data.currentSprint || '',
    hackathonStage: data.hackathonStage || '',
    githubStatus: data.githubStatus || '',
    importantDiscussions: data.importantDiscussions || [],
    summary: data.summary || '',
    lastUpdated: data.lastUpdated || new Date(),
    async save() {
      const index = memoryDB.findIndex(m => m.projectId.toString() === this.projectId.toString());
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        userId: this.userId,
        conversationId: this.conversationId,
        messages: this.messages,
        currentImplementation: this.currentImplementation,
        currentDebuggingSession: this.currentDebuggingSession,
        currentFeature: this.currentFeature,
        currentApis: this.currentApis,
        currentDeploymentIssue: this.currentDeploymentIssue,
        architectureDecisions: this.architectureDecisions,
        techStackDecisions: this.techStackDecisions,
        projectMilestones: this.projectMilestones,
        previousAiAdvice: this.previousAiAdvice,
        currentBlockers: this.currentBlockers,
        completedTasks: this.completedTasks,
        recentRecommendations: this.recentRecommendations,
        currentSprint: this.currentSprint,
        hackathonStage: this.hackathonStage,
        githubStatus: this.githubStatus,
        importantDiscussions: this.importantDiscussions,
        summary: this.summary,
        lastUpdated: new Date()
      };
      if (index !== -1) {
        memoryDB[index] = serialized;
      } else {
        memoryDB.push(serialized);
      }
      return this;
    }
  };
};

const MockConversationMemoryModel = {
  findOne: async (query) => {
    if (!query || !query.projectId) return null;
    const match = memoryDB.find(m => m.projectId.toString() === query.projectId.toString());
    return match ? createMockMemoryInstance(match) : null;
  },
  create: async (data) => {
    const memory = createMockMemoryInstance(data);
    await memory.save();
    return memory;
  }
};

const ModelProxy = new Proxy(MongoConversationMemory, {
  get(target, prop) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockConversationMemoryModel) {
      return Reflect.get(MockConversationMemoryModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockMemoryInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
