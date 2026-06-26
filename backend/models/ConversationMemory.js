const mongoose = require('mongoose');

const conversationMemorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
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
    architectureDecisions: data.architectureDecisions || [],
    techStackDecisions: data.techStackDecisions || [],
    projectMilestones: data.projectMilestones || [],
    previousAiAdvice: data.previousAiAdvice || [],
    importantDiscussions: data.importantDiscussions || [],
    summary: data.summary || '',
    lastUpdated: data.lastUpdated || new Date(),
    async save() {
      const index = memoryDB.findIndex(m => m.projectId.toString() === this.projectId.toString());
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        architectureDecisions: this.architectureDecisions,
        techStackDecisions: this.techStackDecisions,
        projectMilestones: this.projectMilestones,
        previousAiAdvice: this.previousAiAdvice,
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
