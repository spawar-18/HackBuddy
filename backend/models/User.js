const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: function() {
      // Password is only required if googleId and githubId are not present
      return !this.googleId && !this.githubId;
    }
  },
  googleId: {
    type: String,
    sparse: true // Allows multiple null/undefined values but enforces uniqueness if present
  },
  githubId: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  resumeUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongoUser = mongoose.model('User', userSchema);

// In-Memory Database Fallback for local testing when Atlas is unreachable
const memoryDB = [];

class MockUserInstance {
  constructor(data) {
    this._id = data._id || 'mock_' + Math.random().toString(36).substring(2, 11);
    this.name = data.name;
    this.email = data.email ? data.email.toLowerCase() : '';
    this.password = data.password;
    this.googleId = data.googleId;
    this.githubId = data.githubId;
    this.avatar = data.avatar || '';
    this.skills = data.skills || [];
    this.profileCompleted = data.profileCompleted || false;
    this.resumeUrl = data.resumeUrl || '';
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const index = memoryDB.findIndex(u => u._id === this._id);
    const serialized = {
      _id: this._id,
      name: this.name,
      email: this.email,
      password: this.password,
      googleId: this.googleId,
      githubId: this.githubId,
      avatar: this.avatar,
      skills: this.skills,
      profileCompleted: this.profileCompleted,
      resumeUrl: this.resumeUrl,
      createdAt: this.createdAt
    };
    if (index !== -1) {
      memoryDB[index] = serialized;
    } else {
      memoryDB.push(serialized);
    }
    return this;
  }
}
const MockUserModel = {
  findOne: async (query) => {
    let match = null;
    if (query && query.email) {
      const targetEmail = query.email.toLowerCase();
      match = memoryDB.find(u => u.email === targetEmail);
    } else if (query && query.$or) {
      match = memoryDB.find(u => {
        return query.$or.some(q => {
          if (q.email && u.email === q.email.toLowerCase()) return true;
          if (q.googleId && u.googleId === q.googleId) return true;
          if (q.githubId && u.githubId === q.githubId) return true;
          return false;
        });
      });
    } else if (memoryDB.length > 0) {
      match = memoryDB[0];
    }
    return match ? new MockUserInstance(match) : null;
  },

  findById: (id) => {
    const match = memoryDB.find(u => u._id === id);
    const result = match ? new MockUserInstance(match) : null;
    
    // Support chainable .select()
    const chain = {
      select: (fields) => {
        if (!result) return null;
        if (fields && fields.includes('-password')) {
          const { password, ...rest } = result;
          return rest;
        }
        return result;
      },
      // Make thenable so it resolves when awaited directly
      then: (resolve) => resolve(result),
      catch: (reject) => {}
    };
    
    return Object.assign(Promise.resolve(result), chain);
  },

  create: async (data) => {
    if (data.email) {
      const emailLower = data.email.toLowerCase();
      const exists = memoryDB.some(u => u.email === emailLower);
      if (exists) {
        throw new Error('User already exists');
      }
    }
    const user = new MockUserInstance(data);
    await user.save();
    return user;
  }
};

// Export a Proxy that dynamically switches between MongoDB and local in-memory DB
const ModelProxy = new Proxy(MongoUser, {
  get(target, prop) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    // If not connected to MongoDB, redirect target model calls to the mock database
    if (prop in MockUserModel) {
      return Reflect.get(MockUserModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (process.env.MONGO_URI || mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return new MockUserInstance(argumentsList[0] || {});
  }
});

module.exports = ModelProxy;
