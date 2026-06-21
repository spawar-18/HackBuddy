const mongoose = require('mongoose');

const hackathonConfigSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  hackathonName: {
    type: String,
    required: [true, 'Hackathon name is required'],
    trim: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  codeFreezeTime: {
    type: Date
  },
  presentationTime: {
    type: Date
  },
  submissionTime: {
    type: Date
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Running', 'Paused', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  }
}, {
  timestamps: true
});

const MongoHackathonConfig = mongoose.model('HackathonConfig', hackathonConfigSchema);

// In-Memory Fallback
const memoryDB = [];

const createMockConfigInstance = (data) => {
  return {
    _id: data._id || 'mock_hc_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    hackathonName: data.hackathonName || '',
    startTime: data.startTime ? new Date(data.startTime) : new Date(),
    endTime: data.endTime ? new Date(data.endTime) : new Date(Date.now() + 48 * 60 * 60 * 1000),
    codeFreezeTime: data.codeFreezeTime ? new Date(data.codeFreezeTime) : null,
    presentationTime: data.presentationTime ? new Date(data.presentationTime) : null,
    submissionTime: data.submissionTime ? new Date(data.submissionTime) : null,
    timezone: data.timezone || 'UTC',
    status: data.status || 'Upcoming',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    async save() {
      const index = memoryDB.findIndex(hc => hc._id === this._id || hc.projectId.toString() === this.projectId.toString());
      this.updatedAt = new Date();
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        hackathonName: this.hackathonName,
        startTime: this.startTime,
        endTime: this.endTime,
        codeFreezeTime: this.codeFreezeTime,
        presentationTime: this.presentationTime,
        submissionTime: this.submissionTime,
        timezone: this.timezone,
        status: this.status,
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

const MockHackathonConfigModel = {
  findOne: async (query) => {
    let match = null;
    if (query && query.projectId) {
      match = memoryDB.find(hc => hc.projectId.toString() === query.projectId.toString());
    } else if (query && query._id) {
      match = memoryDB.find(hc => hc._id.toString() === query._id.toString());
    }
    return match ? createMockConfigInstance(match) : null;
  },
  create: async (data) => {
    const hc = createMockConfigInstance(data);
    await hc.save();
    return hc;
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
  }
};

const ModelProxy = new Proxy(MongoHackathonConfig, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockHackathonConfigModel) {
      return Reflect.get(MockHackathonConfigModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockConfigInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
