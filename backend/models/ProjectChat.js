const mongoose = require('mongoose');

const projectChatSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const MongoProjectChat = mongoose.model('ProjectChat', projectChatSchema);

const memoryDB = [];

const createMockChatInstance = (data) => {
  return {
    _id: data._id || 'mock_chat_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    userId: data.userId,
    role: data.role,
    message: data.message,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    async save() {
      const index = memoryDB.findIndex(c => c._id === this._id);
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        userId: this.userId,
        role: this.role,
        message: this.message,
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

const MockProjectChatModel = {
  find: (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = memoryDB.filter(c => c.projectId.toString() === query.projectId.toString());
    }
    
    // Sort and Limit chain simulator
    const chain = {
      sort: function(sortOption) {
        if (sortOption && sortOption.createdAt) {
          const order = sortOption.createdAt;
          // Clone results so we don't mutate original array
          results = [...results].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return order === 1 || order === 'asc' ? timeA - timeB : timeB - timeA;
          });
        }
        return this;
      },
      limit: function(num) {
        if (typeof num === 'number') {
          results = results.slice(0, num);
        }
        return this;
      },
      then: async function(resolve, reject) {
        try {
          resolve(results.map(c => createMockChatInstance(c)));
        } catch (err) {
          if (reject) reject(err);
        }
      }
    };
    return chain;
  },
  create: async (data) => {
    const chat = createMockChatInstance(data);
    await chat.save();
    return chat;
  }
};

const ModelProxy = new Proxy(MongoProjectChat, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockProjectChatModel) {
      return Reflect.get(MockProjectChatModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockChatInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
