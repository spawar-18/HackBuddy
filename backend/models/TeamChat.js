const mongoose = require('mongoose');

const teamChatSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userAvatar: {
    type: String,
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for fast queries
teamChatSchema.index({ teamId: 1, createdAt: 1 });

const MongoTeamChat = mongoose.model('TeamChat', teamChatSchema);

// In-Memory Database Fallback
const memoryDB = [];

const createMockInstance = (data) => ({
  _id: data._id || 'tchat_' + Math.random().toString(36).substring(2, 11),
  teamId: data.teamId,
  userId: data.userId,
  userName: data.userName,
  userAvatar: data.userAvatar || null,
  message: data.message,
  createdAt: data.createdAt || new Date(),
  updatedAt: data.updatedAt || new Date(),
  async save() {
    const index = memoryDB.findIndex(c => c._id === this._id);
    const serialized = {
      _id: this._id, teamId: this.teamId, userId: this.userId,
      userName: this.userName, userAvatar: this.userAvatar,
      message: this.message, createdAt: this.createdAt, updatedAt: this.updatedAt
    };
    if (index !== -1) memoryDB[index] = serialized;
    else memoryDB.push(serialized);
    return this;
  }
});

const MockModel = {
  find: (query) => {
    let results = memoryDB;
    if (query && query.teamId) {
      results = memoryDB.filter(c => c.teamId.toString() === query.teamId.toString());
    }
    const chain = {
      sort: function (sortOption) {
        if (sortOption && sortOption.createdAt !== undefined) {
          const order = sortOption.createdAt;
          results = [...results].sort((a, b) => {
            const tA = new Date(a.createdAt).getTime();
            const tB = new Date(b.createdAt).getTime();
            return (order === 1 || order === 'asc') ? tA - tB : tB - tA;
          });
        }
        return this;
      },
      limit: function (num) {
        if (typeof num === 'number') results = results.slice(-num);
        return this;
      },
      then: async function (resolve, reject) {
        try { resolve(results.map(c => createMockInstance(c))); }
        catch (err) { if (reject) reject(err); }
      }
    };
    return chain;
  },
  create: async (data) => {
    const chat = createMockInstance(data);
    await chat.save();
    return chat;
  },
  countDocuments: async (query) => {
    if (query && query.teamId) {
      return memoryDB.filter(c => c.teamId.toString() === query.teamId.toString()).length;
    }
    return memoryDB.length;
  }
};

const ModelProxy = new Proxy(MongoTeamChat, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) return Reflect.get(target, prop);
    if (prop in MockModel) return Reflect.get(MockModel, prop);
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) return Reflect.construct(target, argumentsList);
    return createMockInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
