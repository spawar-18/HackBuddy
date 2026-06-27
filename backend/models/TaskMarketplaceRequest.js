const mongoose = require('mongoose');

const taskMarketplaceRequestSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  taskId: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    enum: ['REASSIGNMENT', 'CLAIM', 'SWAP', 'COLLABORATOR', 'COLLABORATION', 'HELP'],
    required: true
  },
  requestedBy: {
    type: String,
    required: true
  },
  targetUser: {
    type: String,
    default: ''
  },
  targetTaskId: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  currentBlockers: {
    type: [String],
    default: []
  },
  estimatedEffort: {
    type: Number,
    default: 0
  },
  suggestedMember: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'SuggestedAlternative'],
    default: 'Pending'
  },
  decisionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  impact: {
    workloadDelta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    riskDelta: {
      type: Number,
      default: 0
    },
    commandCenterInvalidated: {
      type: Boolean,
      default: false
    }
  },
  activityLog: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  aiRecommendation: {
    recommendation: {
      type: String,
      default: ''
    },
    confidenceScore: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

const MongoRequest = mongoose.model('TaskMarketplaceRequest', taskMarketplaceRequestSchema);

// In-Memory Database Fallback for local testing when Atlas is unreachable
const memoryDB = [];

const createMockRequestInstance = (data) => {
  return {
    _id: data._id || 'mock_req_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    taskId: data.taskId,
    requestType: data.requestType,
    requestedBy: data.requestedBy,
    targetUser: data.targetUser || '',
    targetTaskId: data.targetTaskId || '',
    reason: data.reason || '',
    currentBlockers: data.currentBlockers || [],
    estimatedEffort: data.estimatedEffort || 0,
    suggestedMember: data.suggestedMember || '',
    status: data.status || 'Pending',
    decisionBy: data.decisionBy || null,
    approvedAt: data.approvedAt || null,
    rejectedAt: data.rejectedAt || null,
    impact: data.impact || { workloadDelta: {}, riskDelta: 0, commandCenterInvalidated: false },
    activityLog: data.activityLog || [],
    aiRecommendation: data.aiRecommendation || { recommendation: '', confidenceScore: 0, reason: '' },
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    async save() {
      this.updatedAt = new Date();
      const index = memoryDB.findIndex(r => r._id === this._id);
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        taskId: this.taskId,
        requestType: this.requestType,
        requestedBy: this.requestedBy,
        targetUser: this.targetUser,
        targetTaskId: this.targetTaskId,
        reason: this.reason,
        currentBlockers: this.currentBlockers,
        estimatedEffort: this.estimatedEffort,
        suggestedMember: this.suggestedMember,
        status: this.status,
        decisionBy: this.decisionBy,
        approvedAt: this.approvedAt,
        rejectedAt: this.rejectedAt,
        impact: this.impact,
        activityLog: this.activityLog,
        aiRecommendation: this.aiRecommendation,
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

const MockRequestModel = {
  find: async (query) => {
    let results = memoryDB;
    if (query) {
      if (query.projectId) {
        results = results.filter(r => r.projectId.toString() === query.projectId.toString());
      }
      if (query.status) {
        results = results.filter(r => r.status === query.status);
      }
    }
    return results.map(r => createMockRequestInstance(r));
  },
  findOne: async (query) => {
    const match = memoryDB.find(r => r._id === query._id);
    return match ? createMockRequestInstance(match) : null;
  },
  findById: async (id) => {
    const match = memoryDB.find(r => r._id === id);
    return match ? createMockRequestInstance(match) : null;
  },
  create: async (data) => {
    const request = createMockRequestInstance(data);
    await request.save();
    return request;
  }
};

const ModelProxy = new Proxy(MongoRequest, {
  get(target, prop) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockRequestModel) {
      return Reflect.get(MockRequestModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockRequestInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
