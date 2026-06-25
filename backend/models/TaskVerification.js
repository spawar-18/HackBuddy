const mongoose = require('mongoose');

const taskVerificationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  memberName: {
    type: String,
    required: true,
    trim: true
  },
  taskName: {
    type: String,
    required: true,
    trim: true
  },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Partially Verified', 'Cannot Verify', 'Needs Manual Review', 'Pending Verification'],
    default: 'Pending Verification'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  matchedFiles: {
    type: [String],
    default: []
  },
  matchedCommits: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  reasoning: {
    type: String,
    default: ''
  },
  missingEvidence: {
    type: [String],
    default: []
  },
  recommendation: {
    type: String,
    default: ''
  },
  timeline: [
    {
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }
  ],
  overridden: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    default: ''
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  overriddenAt: {
    type: Date,
    default: null
  },
  lastVerifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure a single verification record per project + task + member combo
taskVerificationSchema.index({ projectId: 1, memberName: 1, taskName: 1 }, { unique: true });

const MongoTaskVerification = mongoose.model('TaskVerification', taskVerificationSchema);

// In-Memory Database Fallback for local testing when Atlas is unreachable
const memoryDB = [];

const createMockInstance = (data) => {
  return {
    _id: data._id || 'mock_verif_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    memberName: data.memberName,
    taskName: data.taskName,
    verificationStatus: data.verificationStatus || 'Pending Verification',
    confidence: data.confidence || 0,
    matchedFiles: data.matchedFiles || [],
    matchedCommits: data.matchedCommits || [],
    reasoning: data.reasoning || '',
    missingEvidence: data.missingEvidence || [],
    recommendation: data.recommendation || '',
    timeline: data.timeline || [],
    overridden: data.overridden || false,
    overrideReason: data.overrideReason || '',
    overriddenBy: data.overriddenBy || null,
    overriddenAt: data.overriddenAt || null,
    lastVerifiedAt: data.lastVerifiedAt || new Date(),
    async save() {
      const index = memoryDB.findIndex(v => v._id === this._id);
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        memberName: this.memberName,
        taskName: this.taskName,
        verificationStatus: this.verificationStatus,
        confidence: this.confidence,
        matchedFiles: this.matchedFiles,
        matchedCommits: this.matchedCommits,
        reasoning: this.reasoning,
        missingEvidence: this.missingEvidence,
        recommendation: this.recommendation,
        timeline: this.timeline,
        overridden: this.overridden,
        overrideReason: this.overrideReason,
        overriddenBy: this.overriddenBy,
        overriddenAt: this.overriddenAt,
        lastVerifiedAt: this.lastVerifiedAt
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

const MockTaskVerificationModel = {
  find: async (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = memoryDB.filter(v => v.projectId.toString() === query.projectId.toString());
    }
    return results.map(v => createMockInstance(v));
  },
  findOne: async (query) => {
    let match = memoryDB.find(v => {
      let isMatch = true;
      if (query.projectId && v.projectId.toString() !== query.projectId.toString()) isMatch = false;
      if (query.memberName && v.memberName !== query.memberName) isMatch = false;
      if (query.taskName && v.taskName !== query.taskName) isMatch = false;
      return isMatch;
    });
    return match ? createMockInstance(match) : null;
  },
  findOneAndUpdate: async (query, update, options = {}) => {
    let match = memoryDB.find(v => {
      let isMatch = true;
      if (query.projectId && v.projectId.toString() !== query.projectId.toString()) isMatch = false;
      if (query.memberName && v.memberName !== query.memberName) isMatch = false;
      if (query.taskName && v.taskName !== query.taskName) isMatch = false;
      return isMatch;
    });

    if (!match && options.upsert) {
      const data = { ...query, ...update.$set, ...update };
      match = createMockInstance(data);
      await match.save();
      return match;
    }

    if (match) {
      const updatedData = { ...match, ...update.$set, ...update };
      const inst = createMockInstance(updatedData);
      await inst.save();
      return inst;
    }

    return null;
  },
  create: async (data) => {
    const inst = createMockInstance(data);
    await inst.save();
    return inst;
  },
  deleteMany: async (query) => {
    if (query && query.projectId) {
      const count = memoryDB.length;
      let i = memoryDB.length;
      while (i--) {
        if (memoryDB[i].projectId.toString() === query.projectId.toString()) {
          memoryDB.splice(i, 1);
        }
      }
      return { deletedCount: count - memoryDB.length };
    }
    return { deletedCount: 0 };
  }
};

const ModelProxy = new Proxy(MongoTaskVerification, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTaskVerificationModel) {
      return Reflect.get(MockTaskVerificationModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
