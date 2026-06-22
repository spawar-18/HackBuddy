const mongoose = require('mongoose');

const techStackAnalysisSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  analysisType: {
    type: String,
    default: 'TechStack'
  },
  readinessScore: {
    type: Number,
    required: false,
    default: 0
  },
  consensusScore: {
    type: Number,
    required: false,
    default: 0
  },
  strengths: {
    type: [String],
    default: []
  },
  risks: {
    type: [String],
    default: []
  },
  recommendedChanges: {
    type: [String],
    default: []
  },
  recommendedStack: {
    frontend: { type: [String], default: [] },
    backend: { type: [String], default: [] },
    database: { type: [String], default: [] },
    ai: { type: [String], default: [] },
    deployment: { type: [String], default: [] }
  },
  reasoning: {
    type: String,
    default: ''
  },
  finalRecommendation: {
    type: String,
    default: ''
  },
  aiReport: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

const MongoTechStackAnalysis = mongoose.model('TechStackAnalysis', techStackAnalysisSchema);

// In-Memory Fallback
const memoryDB = [];

const createMockAnalysisInstance = (data) => {
  return {
    _id: data._id || 'mock_tsa_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    readinessScore: data.readinessScore || 0,
    consensusScore: data.consensusScore || 0,
    strengths: data.strengths || [],
    risks: data.risks || [],
    recommendedChanges: data.recommendedChanges || [],
    recommendedStack: data.recommendedStack || {
      frontend: [],
      backend: [],
      database: [],
      ai: [],
      deployment: []
    },
    reasoning: data.reasoning || '',
    finalRecommendation: data.finalRecommendation || '',
    generatedAt: data.generatedAt || new Date(),
    markModified(path) {
      // dummy function for in-memory database fallback
    },
    async save() {
      const index = memoryDB.findIndex(a => a._id === this._id);
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        readinessScore: this.readinessScore,
        consensusScore: this.consensusScore,
        strengths: this.strengths,
        risks: this.risks,
        recommendedChanges: this.recommendedChanges,
        recommendedStack: this.recommendedStack,
        reasoning: this.reasoning,
        finalRecommendation: this.finalRecommendation,
        generatedAt: this.generatedAt
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

const MockTechStackAnalysisModel = {
  findOne: async (query) => {
    let match = null;
    if (query && query.projectId) {
      match = memoryDB.find(a => a.projectId.toString() === query.projectId.toString());
    }
    return match ? createMockAnalysisInstance(match) : null;
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
    const analysis = createMockAnalysisInstance(data);
    await analysis.save();
    return analysis;
  }
};

const ModelProxy = new Proxy(MongoTechStackAnalysis, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTechStackAnalysisModel) {
      return Reflect.get(MockTechStackAnalysisModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockAnalysisInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
