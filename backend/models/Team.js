const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  analysis: {
    readinessScore: Number,
    strengths: [String],
    skillGaps: [String],
    recommendedRoles: [
      {
        member: String,
        role: String
      }
    ]
  },
  analysisGeneratedAt: {
    type: Date,
    default: null
  },
  analysisVersion: {
    type: Number,
    default: 0
  }
});

const MongoTeam = mongoose.model('Team', teamSchema);

// In-Memory Database Fallback for local testing when Atlas is unreachable
const memoryDB = [];

const createMockTeamInstance = (data) => {
  return {
    _id: data._id || 'mock_team_' + Math.random().toString(36).substring(2, 11),
    teamName: data.teamName,
    description: data.description || '',
    inviteCode: data.inviteCode,
    createdBy: data.createdBy,
    members: data.members || [],
    createdAt: data.createdAt || new Date(),
    analysis: data.analysis || null,
    analysisGeneratedAt: data.analysisGeneratedAt || null,
    analysisVersion: data.analysisVersion || 0,
    async save() {
      const index = memoryDB.findIndex(t => t._id === this._id);
      const serialized = {
        _id: this._id,
        teamName: this.teamName,
        description: this.description,
        inviteCode: this.inviteCode,
        createdBy: this.createdBy,
        members: this.members,
        createdAt: this.createdAt,
        analysis: this.analysis,
        analysisGeneratedAt: this.analysisGeneratedAt,
        analysisVersion: this.analysisVersion
      };
      if (index !== -1) {
        memoryDB[index] = serialized;
      } else {
        memoryDB.push(serialized);
      }
      return this;
    },
    async deleteOne() {
      const index = memoryDB.findIndex(t => t._id === this._id);
      if (index !== -1) {
        memoryDB.splice(index, 1);
      }
      return this;
    }
  };
};

const MockTeamModel = {
  findByIdAndDelete: async (id) => {
    const index = memoryDB.findIndex(t => t._id === id);
    if (index !== -1) {
      const deleted = memoryDB.splice(index, 1);
      return deleted[0];
    }
    return null;
  },
  find: async (query) => {
    let results = memoryDB;
    if (query && query.members) {
      const targetUserId = typeof query.members === 'object' && query.members.$in ? query.members.$in[0] : query.members;
      results = memoryDB.filter(t => t.members.includes(targetUserId));
    }
    return results.map(t => createMockTeamInstance(t));
  },

  findOne: async (query) => {
    let match = null;
    if (query.inviteCode) {
      match = memoryDB.find(t => t.inviteCode === query.inviteCode);
    } else if (query._id) {
      match = memoryDB.find(t => t._id === query._id);
    }
    return match ? createMockTeamInstance(match) : null;
  },

  findById: (id) => {
    const match = memoryDB.find(t => t._id === id);
    let result = match ? JSON.parse(JSON.stringify(match)) : null;
    
    const chain = {
      populate: function(arg1, arg2) {
        if (!result) return chain;
        const User = require('./User');
        const path = typeof arg1 === 'string' ? arg1 : arg1.path;
        
        if (!this._populates) this._populates = [];
        this._populates.push({ path });
        return chain;
      },
      then: async function(resolve, reject) {
        try {
          if (!result) return resolve(null);
          const User = require('./User');
          const populates = this._populates || [];
          
          for (const pop of populates) {
            if (pop.path === 'createdBy' && result.createdBy) {
              const u = await User.findById(result.createdBy);
              if (u) {
                result.createdBy = {
                  _id: u._id,
                  name: u.name,
                  email: u.email,
                  avatar: u.avatar,
                  skills: u.skills
                };
              }
            } else if (pop.path === 'members' && result.members) {
              const populatedMembers = [];
              for (const memberId of result.members) {
                const u = await User.findById(memberId);
                if (u) {
                  populatedMembers.push({
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar,
                    skills: u.skills
                  });
                }
              }
              result.members = populatedMembers;
            }
          }
          resolve(result);
        } catch (err) {
          if (reject) reject(err);
        }
      }
    };
    return chain;
  },

  create: async (data) => {
    if (data.inviteCode) {
      const exists = memoryDB.some(t => t.inviteCode === data.inviteCode);
      if (exists) {
        throw new Error('Team with invite code already exists');
      }
    }
    const team = createMockTeamInstance(data);
    await team.save();
    return team;
  }
};

const ModelProxy = new Proxy(MongoTeam, {
  get(target, prop) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.get(target, prop);
    }
    if (prop in MockTeamModel) {
      return Reflect.get(MockTeamModel, prop);
    }
    return Reflect.get(target, prop);
  },
  construct(target, argumentsList) {
    if (mongoose.connection.readyState === 1) {
      return Reflect.construct(target, argumentsList);
    }
    return createMockTeamInstance(argumentsList[0] || {});
  }
});


module.exports = ModelProxy;
