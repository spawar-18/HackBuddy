const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  problemStatement: {
    type: String,
    required: [true, 'Problem statement is required'],
    trim: true
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
  },
  projectReview: {
    feasibilityScore: Number,
    problemSolutionAlignment: String,
    projectRisks: [String],
    missingSkills: [String],
    mustBuildFeatures: [String],
    optionalFeatures: [String],
    featuresToRemove: [String],
    improvementSuggestions: [String],
    reasoning: String,
    judgePerspective: String,
    executionStrategy: [String]
  },
  projectReviewGeneratedAt: {
    type: Date
  },
  taskPlan: {
    projectTasks: {
      coreFeatures: [String],
      technicalTasks: [String],
      deploymentTasks: [String]
    },
    assignments: [{
      member: String,
      skills: [String],
      assignedTasks: [{
        task: String,
        status: {
          type: String,
          enum: ['Not Started', 'In Progress', 'Completed'],
          default: 'Not Started'
        },
        assignedTo: {
          type: String,
          default: ''
        },
        collaborators: {
          type: [String],
          default: []
        },
        marketplaceStatus: {
          type: String,
          enum: ['Locked', 'Available', 'SwapRequested', 'ClaimRequested', 'ReassignmentRequested'],
          default: 'Locked'
        },
        updatedAt: {
          type: Date,
          default: Date.now
        }
      }],
      reason: String
    }],
    workloadDistribution: [{
      member: String,
      percentage: Number
    }],
    executionOrder: [String],
    criticalTasks: [String],
    recommendedFocus: [String],
    warnings: [String]
  },
  taskPlanGeneratedAt: {
    type: Date
  },
  finalTechStack: {
    frontend: { type: String, default: '' },
    backend: { type: String, default: '' },
    database: { type: String, default: '' },
    ai: { type: String, default: '' },
    deployment: { type: String, default: '' }
  },
  commandCenterReport: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  commandCenterReportGeneratedAt: {
    type: Date,
    default: null
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
    projectReview: data.projectReview || null,
    projectReviewGeneratedAt: data.projectReviewGeneratedAt || null,
    taskPlan: data.taskPlan || null,
    taskPlanGeneratedAt: data.taskPlanGeneratedAt || null,
    finalTechStack: data.finalTechStack || {
      frontend: '',
      backend: '',
      database: '',
      ai: '',
      deployment: ''
    },
    commandCenterReport: data.commandCenterReport || null,
    commandCenterReportGeneratedAt: data.commandCenterReportGeneratedAt || null,
    markModified(path) {
      // dummy function for in-memory database fallback
    },
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
        createdAt: this.createdAt,
        projectReview: this.projectReview,
        projectReviewGeneratedAt: this.projectReviewGeneratedAt,
        taskPlan: this.taskPlan,
        taskPlanGeneratedAt: this.taskPlanGeneratedAt,
        finalTechStack: this.finalTechStack
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
    if (query && query.teamId) {
      match = memoryDB.find(p => p.teamId.toString() === query.teamId.toString());
    } else if (query && query._id) {
      match = memoryDB.find(p => p._id === query._id);
    } else if (memoryDB.length > 0) {
      match = memoryDB[0];
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
