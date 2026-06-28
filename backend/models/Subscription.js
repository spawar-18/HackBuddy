const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['FREE', 'PRO', 'TEAM'],
    default: 'FREE'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'active'
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  paymentId: {
    type: String,
    default: null
  },
  signature: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` on every save
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const MongoSubscription = mongoose.model('Subscription', subscriptionSchema);

// ─── In-Memory Fallback ────────────────────────────────────────────────────────
const memoryDB = [];

class MockSubscriptionInstance {
  constructor(data) {
    this._id = data._id || 'mock_sub_' + Math.random().toString(36).substring(2, 11);
    this.userId = data.userId;
    this.plan = data.plan || 'FREE';
    this.status = data.status || 'active';
    this.razorpayOrderId = data.razorpayOrderId || null;
    this.paymentId = data.paymentId || null;
    this.signature = data.signature || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    this.updatedAt = new Date();
    const index = memoryDB.findIndex(
      s => s.userId && this.userId && s.userId.toString() === this.userId.toString()
    );
    const serialized = {
      _id: this._id,
      userId: this.userId,
      plan: this.plan,
      status: this.status,
      razorpayOrderId: this.razorpayOrderId,
      paymentId: this.paymentId,
      signature: this.signature,
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
}

const MockSubscriptionModel = {
  findOne: async (query) => {
    let match = null;
    if (query && query.userId) {
      const uid = query.userId.toString();
      match = memoryDB.find(s => s.userId && s.userId.toString() === uid);
    } else if (query && query._id) {
      match = memoryDB.find(s => s._id === query._id);
    }
    return match ? new MockSubscriptionInstance(match) : null;
  },

  findById: async (id) => {
    const match = memoryDB.find(s => s._id === id);
    return match ? new MockSubscriptionInstance(match) : null;
  },

  create: async (data) => {
    const uid = data.userId && data.userId.toString();
    if (uid && memoryDB.some(s => s.userId && s.userId.toString() === uid)) {
      throw new Error('Subscription already exists for this user');
    }
    const sub = new MockSubscriptionInstance(data);
    await sub.save();
    return sub;
  },

  find: async (query) => {
    if (query && query.plan) {
      return memoryDB.filter(s => s.plan === query.plan).map(s => new MockSubscriptionInstance(s));
    }
    return memoryDB.map(s => new MockSubscriptionInstance(s));
  },

  countDocuments: async (query) => {
    if (query && query.plan) {
      return memoryDB.filter(s => s.plan === query.plan).length;
    }
    return memoryDB.length;
  }
};

// ─── Proxy: MongoDB when connected, in-memory fallback otherwise ───────────────
const ModelProxy = new Proxy(MongoSubscription, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockSubscriptionModel) {
      return Reflect.get(MockSubscriptionModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return new MockSubscriptionInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
