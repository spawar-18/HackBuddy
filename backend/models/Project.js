const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  problemStatement: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  track: {
    type: String,
    trim: true,
    default: ''
  },
  duration: {
    type: String,
    trim: true,
    default: ''
  },
  featuresToBuild: {
    type: [String],
    default: []
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Completed'],
    default: 'Planning'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongoProject = mongoose.model('Project', projectSchema);

// In-Memory Database Fallback for local testing when Atlas is unreachable
const memoryDB = [];

const createMockProjectInstance = (data) => {
  return {
    _id: data._id || 'mock_proj_' + Math.random().toString(36).substring(2, 11),
    projectName: data.projectName,
    problemStatement: data.problemStatement || '',
    description: data.description || '',
    track: data.track || '',
    duration: data.duration || '',
    featuresToBuild: data.featuresToBuild || [],
    teamId: data.teamId,
    createdBy: data.createdBy,
    status: data.status || 'Planning',
    createdAt: data.createdAt || new Date(),
    async save() {
      const index = memoryDB.findIndex(p => p._id === this._id);
      const serialized = {
        _id: this._id,
        projectName: this.projectName,
        problemStatement: this.problemStatement,
        description: this.description,
        track: this.track,
        duration: this.duration,
        featuresToBuild: this.featuresToBuild,
        teamId: this.teamId,
        createdBy: this.createdBy,
        status: this.status,
        createdAt: this.createdAt
      };
      if (index !== -1) {
        memoryDB[index] = serialized;
      } else {
        memoryDB.push(serialized);
      }
      return this;
    },
    async deleteOne() {
      const index = memoryDB.findIndex(p => p._id === this._id);
      if (index !== -1) {
        memoryDB.splice(index, 1);
      }
      return this;
    }
  };
};

const MockProjectModel = {
  findByIdAndDelete: async (id) => {
    const index = memoryDB.findIndex(p => p._id === id);
    if (index !== -1) {
      const deleted = memoryDB.splice(index, 1);
      return deleted[0];
    }
    return null;
  },
  find: async (query) => {
    let results = memoryDB;
    if (query && query.teamId) {
      results = memoryDB.filter(p => p.teamId.toString() === query.teamId.toString());
    }
    return results.map(p => createMockProjectInstance(p));
  },
  findOne: async (query) => {
    let match = null;
    if (query.teamId) {
      match = memoryDB.find(p => p.teamId.toString() === query.teamId.toString());
    } else if (query._id) {
      match = memoryDB.find(p => p._id === query._id);
    }
    return match ? createMockProjectInstance(match) : null;
  },
  findById: (id) => {
    const match = memoryDB.find(p => p._id === id);
    let result = match ? JSON.parse(JSON.stringify(match)) : null;
    
    const chain = {
      then: async function(resolve, reject) {
        try {
          if (!result) return resolve(null);
          resolve(result);
        } catch (err) {
          if (reject) reject(err);
        }
      }
    };
    return chain;
  },
  create: async (data) => {
    const project = createMockProjectInstance(data);
    await project.save();
    return project;
  }
};

const ModelProxy = new Proxy(MongoProject, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockProjectModel) {
      return Reflect.get(MockProjectModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockProjectInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
