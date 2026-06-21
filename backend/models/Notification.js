const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Milestone', 'TaskOverdue', 'ActionRequired', 'General', 'Marketplace'],
    default: 'General'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const MongoNotification = mongoose.model('Notification', notificationSchema);

// In-Memory Fallback
const memoryDB = [];

const createMockNotificationInstance = (data) => {
  return {
    _id: data._id || 'mock_notif_' + Math.random().toString(36).substring(2, 11),
    projectId: data.projectId,
    userId: data.userId || null,
    message: data.message || '',
    type: data.type || 'General',
    read: data.read !== undefined ? data.read : false,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    async save() {
      const index = memoryDB.findIndex(n => n._id === this._id);
      this.updatedAt = new Date();
      const serialized = {
        _id: this._id,
        projectId: this.projectId,
        userId: this.userId,
        message: this.message,
        type: this.type,
        read: this.read,
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

const MockNotificationModel = {
  find: (query) => {
    let results = memoryDB;
    if (query && query.projectId) {
      results = results.filter(n => n.projectId.toString() === query.projectId.toString());
    }
    if (query && query.userId) {
      results = results.filter(n => n.userId === null || n.userId.toString() === query.userId.toString());
    }
    const data = results.map(n => createMockNotificationInstance(n));
    const chain = {
      sort: function(criteria) {
        data.sort((a, b) => b.createdAt - a.createdAt);
        return chain;
      },
      limit: function(num) {
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
  create: async (data) => {
    const notif = createMockNotificationInstance(data);
    await notif.save();
    return notif;
  },
  updateMany: async (query, update) => {
    let count = 0;
    memoryDB.forEach(n => {
      let match = true;
      if (query.projectId && n.projectId.toString() !== query.projectId.toString()) match = false;
      if (query.userId && (!n.userId || n.userId.toString() !== query.userId.toString())) match = false;
      if (query.read !== undefined && n.read !== query.read) match = false;
      
      if (match) {
        Object.assign(n, update);
        n.updatedAt = new Date();
        count++;
      }
    });
    return { nModified: count };
  }
};

const ModelProxy = new Proxy(MongoNotification, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockNotificationModel) {
      return Reflect.get(MockNotificationModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockNotificationInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
