const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  featureName: {
    type: String,
    required: [true, 'Feature name is required'],
    trim: true,
    enum: [
      'Dashboard',
      'Team Chat',
      'Project Workspace',
      'Tech Stack Consensus',
      'Task Marketplace',
      'AI Mentor',
      'Hackathon Command Center',
      'GitHub Integration',
      'Team Analysis',
      'Profile',
      'Task Verification',
      'Other'
    ]
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['feature_request', 'bug', 'improvement', 'praise', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'implemented', 'dismissed'],
    default: 'new'
  }
}, {
  timestamps: true
});

// Indexes for common query patterns
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ featureName: 1, rating: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
