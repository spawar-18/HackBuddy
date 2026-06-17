const mongoose = require('mongoose');

const techStackProposalSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  frontend: {
    type: String,
    default: ''
  },
  backend: {
    type: String,
    default: ''
  },
  database: {
    type: String,
    default: ''
  },
  ai: {
    type: String,
    default: ''
  },
  deployment: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Proposed', 'Finalized', 'Modified', 'Rejected'],
    default: 'Proposed'
  },
  discussions: [{
    category: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const MongoTechStackProposal = mongoose.model('TechStackProposal', techStackProposalSchema);

// In-Memory Fallback
const memoryDB = [];

const createMockProposalInstance = (data) => {
  return {
    _id: data._id || 'mock_prop_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    createdBy: data.createdBy,
    frontend: data.frontend || '',
    backend: data.backend || '',
    database: data.database || '',
    ai: data.ai || '',
    deployment: data.deployment || '',
    status: data.status || 'Proposed',
    discussions: data.discussions || [],
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    markModified(path) {
      // dummy function for in-memory database fallback
    },
    async save() {
      const index = memoryDB.findIndex(p => p._id === this._id);
      this.updatedAt = new Date();
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        createdBy: this.createdBy,
        frontend: this.frontend,
        backend: this.backend,
        database: this.database,
        ai: this.ai,
        deployment: this.deployment,
        status: this.status,
        discussions: this.discussions,
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

const MockTechStackProposalModel = {
  find: async (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = memoryDB.filter(p => p.projectId.toString() === query.projectId.toString());
    }
    return results.map(p => createMockProposalInstance(p));
  },
  findOne: async (query) => {
    let match = null;
    if (query && query.projectId) {
      match = memoryDB.find(p => p.projectId.toString() === query.projectId.toString());
    } else if (query && query._id) {
      match = memoryDB.find(p => p._id === query._id);
    }
    return match ? createMockProposalInstance(match) : null;
  },
  findById: (id) => {
    const match = memoryDB.find(p => p._id === id);
    const result = match ? createMockProposalInstance(match) : null;
    return Promise.resolve(result);
  },
  findOneAndUpdate: async (query, update, options) => {
    let match = query && query.projectId ? memoryDB.find(p => p.projectId.toString() === query.projectId.toString()) : null;
    if (!match && options && options.upsert && query && query.projectId) {
      const data = { projectId: query.projectId, ...update };
      const newProp = createMockProposalInstance(data);
      await newProp.save();
      return newProp;
    }
    if (match) {
      Object.assign(match, update);
      match.updatedAt = new Date();
      return createMockProposalInstance(match);
    }
    return null;
  },
  create: async (data) => {
    const prop = createMockProposalInstance(data);
    await prop.save();
    return prop;
  }
};

const ModelProxy = new Proxy(MongoTechStackProposal, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTechStackProposalModel) {
      return Reflect.get(MockTechStackProposalModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockProposalInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
