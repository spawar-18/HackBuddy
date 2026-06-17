const mongoose = require('mongoose');

const techStackVoteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  voteType: {
    type: String,
    enum: ['Approve', 'Approve With Concerns', 'Reject'],
    required: true
  },
  confidenceScores: {
    type: Map,
    of: Number,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  suggestedAlternatives: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

const MongoTechStackVote = mongoose.model('TechStackVote', techStackVoteSchema);

// In-Memory Fallback
const memoryDB = [];

const createMockVoteInstance = (data) => {
  return {
    _id: data._id || 'mock_vote_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    userId: data.userId,
    voteType: data.voteType,
    confidenceScores: data.confidenceScores || {},
    reason: data.reason || '',
    suggestedAlternatives: data.suggestedAlternatives || {},
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    markModified(path) {
      // dummy function for in-memory database fallback
    },
    async save() {
      const index = memoryDB.findIndex(v => v._id === this._id);
      this.updatedAt = new Date();
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        userId: this.userId,
        voteType: this.voteType,
        confidenceScores: this.confidenceScores instanceof Map ? Object.fromEntries(this.confidenceScores) : this.confidenceScores,
        reason: this.reason,
        suggestedAlternatives: this.suggestedAlternatives instanceof Map ? Object.fromEntries(this.suggestedAlternatives) : this.suggestedAlternatives,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
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

const MockTechStackVoteModel = {
  find: async (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = memoryDB.filter(v => v.projectId.toString() === query.projectId.toString());
    }
    return results.map(v => createMockVoteInstance(v));
  },
  findOne: async (query) => {
    let match = null;
    if (query && query.projectId && query.userId) {
      match = memoryDB.find(v => v.projectId.toString() === query.projectId.toString() && v.userId.toString() === query.userId.toString());
    }
    return match ? createMockVoteInstance(match) : null;
  },
  deleteMany: async (query) => {
    if (query && query.projectId) {
      let count = 0;
      for (let i = memoryDB.length - 1; i >= 0; i--) {
        if (memoryDB[i].projectId.toString() === query.projectId.toString()) {
          memoryDB.splice(i, 1);
          count++;
        }
      }
      return { deletedCount: count };
    }
    return { deletedCount: 0 };
  },
  create: async (data) => {
    const vote = createMockVoteInstance(data);
    await vote.save();
    return vote;
  }
};

const ModelProxy = new Proxy(MongoTechStackVote, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTechStackVoteModel) {
      return Reflect.get(MockTechStackVoteModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockVoteInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
