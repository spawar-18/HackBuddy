const mongoose = require('mongoose');

const techStackHistorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  editedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    required: true
  },
  previousStack: {
    frontend: { type: String, default: '' },
    backend: { type: String, default: '' },
    database: { type: String, default: '' },
    ai: { type: String, default: '' },
    deployment: { type: String, default: '' },
    otherTools: { type: String, default: '' }
  },
  updatedStack: {
    frontend: { type: String, default: '' },
    backend: { type: String, default: '' },
    database: { type: String, default: '' },
    ai: { type: String, default: '' },
    deployment: { type: String, default: '' },
    otherTools: { type: String, default: '' }
  },
  impactType: {
    type: String,
    enum: ['Minor', 'Major'],
    required: true
  },
  impactScore: {
    type: Number,
    required: true
  },
  aiRecommendation: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const MongoTechStackHistory = mongoose.model('TechStackHistory', techStackHistorySchema);

// In-Memory Fallback
const memoryDB = [];

const createMockHistoryInstance = (data) => {
  return {
    _id: data._id || 'mock_hist_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    versionNumber: data.versionNumber || 1,
    editedBy: data.editedBy,
    editedAt: data.editedAt || new Date(),
    reason: data.reason || '',
    previousStack: data.previousStack || {
      frontend: '',
      backend: '',
      database: '',
      ai: '',
      deployment: '',
      otherTools: ''
    },
    updatedStack: data.updatedStack || {
      frontend: '',
      backend: '',
      database: '',
      ai: '',
      deployment: '',
      otherTools: ''
    },
    impactType: data.impactType || 'Minor',
    impactScore: data.impactScore || 0,
    aiRecommendation: data.aiRecommendation || '',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    markModified(path) {
      // dummy function
    },
    async save() {
      const index = memoryDB.findIndex(h => h._id === this._id);
      this.updatedAt = new Date();
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        versionNumber: this.versionNumber,
        editedBy: this.editedBy,
        editedAt: this.editedAt,
        reason: this.reason,
        previousStack: this.previousStack,
        updatedStack: this.updatedStack,
        impactType: this.impactType,
        impactScore: this.impactScore,
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

const MockTechStackHistoryModel = {
  find: (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = memoryDB.filter(h => h.projectId.toString() === query.projectId.toString());
    }
    const data = results.map(h => createMockHistoryInstance(h));
    const chain = {
      populate: function(path, select) {
        data.forEach(item => {
          if (path === 'editedBy') {
            item.editedBy = {
              _id: item.editedBy || 'mock_user_123',
              name: 'Project Owner / Leader',
              avatar: ''
            };
          }
        });
        return chain;
      },
      sort: function(criteria) {
        return chain;
      },
      then: function(resolve, reject) {
        return Promise.resolve(data).then(resolve, reject);
      },
      catch: function(reject) {
        return Promise.resolve(data).catch(reject);
      }
    };
    return chain;
  },
  findOne: async (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = results.filter(h => h.projectId.toString() === query.projectId.toString());
    }
    if (query && query.versionNumber) {
      results = results.filter(h => h.versionNumber === query.versionNumber);
    }
    return results.length > 0 ? createMockHistoryInstance(results[0]) : null;
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
    const history = createMockHistoryInstance(data);
    await history.save();
    return history;
  }
};

const ModelProxy = new Proxy(MongoTechStackHistory, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTechStackHistoryModel) {
      return Reflect.get(MockTechStackHistoryModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockHistoryInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
