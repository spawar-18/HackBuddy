const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { executePrompt } = require('../services/ai/geminiService');

/**
 * Submit new feedback
 * @route   POST /api/feedback
 * @access  Private
 */
const submitFeedback = async (req, res) => {
  try {
    const { featureName, rating, comment, category } = req.body;

    // Validation
    if (!featureName || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'featureName, rating, and comment are required.'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.'
      });
    }

    const feedback = await Feedback.create({
      userId: req.user.id,
      featureName,
      rating: Math.round(rating),
      comment: comment.trim(),
      category: category || 'other'
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully!',
      data: feedback
    });
  } catch (error) {
    console.error('feedbackController.submitFeedback error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit feedback.'
    });
  }
};

/**
 * Get all feedback with optional filters & pagination
 * @route   GET /api/feedback
 * @access  Private
 */
const getAllFeedback = async (req, res) => {
  try {
    const {
      category,
      featureName,
      status,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (featureName) filter.featureName = featureName;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Feedback.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('feedbackController.getAllFeedback error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch feedback.'
    });
  }
};

/**
 * Get AI-powered summary of all feedback using Gemini
 * @route   GET /api/feedback/summary
 * @access  Private
 */
const getAISummary = async (req, res) => {
  try {
    // Fetch all feedback for analysis
    const allFeedback = await Feedback.find({})
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (allFeedback.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          topRequestedFeatures: [],
          commonComplaints: [],
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
          keyThemes: [],
          recommendations: [],
          totalAnalyzed: 0
        }
      });
    }

    // Build feedback text for AI analysis
    const feedbackText = allFeedback.map((fb, i) =>
      `[${i + 1}] Feature: "${fb.featureName}" | Rating: ${fb.rating}/5 | Category: ${fb.category} | Comment: "${fb.comment}"`
    ).join('\n');

    const systemInstruction = `You are an expert product analyst for HackBuddy, a hackathon team collaboration platform. 
Analyze the following user feedback and provide a structured JSON summary.
Be specific, actionable, and data-driven in your analysis.
Base your analysis strictly on the feedback provided — do not invent data.`;

    const prompt = `Here are ${allFeedback.length} user feedback entries for HackBuddy:

${feedbackText}

Analyze ALL the feedback above and return a JSON object with exactly these fields:
{
  "topRequestedFeatures": [
    { "feature": "Feature name", "requestCount": number, "description": "Brief summary of what users want" }
  ],
  "commonComplaints": [
    { "issue": "Issue title", "mentionCount": number, "severity": "high" | "medium" | "low", "description": "Brief summary" }
  ],
  "sentimentBreakdown": {
    "positive": percentage_number,
    "neutral": percentage_number,
    "negative": percentage_number
  },
  "keyThemes": ["theme1", "theme2", ...],
  "recommendations": [
    { "priority": "high" | "medium" | "low", "action": "Specific recommendation" }
  ],
  "overallSatisfaction": number_out_of_5,
  "totalAnalyzed": ${allFeedback.length}
}

Return ONLY valid JSON, no markdown or extra text.`;

    const rawResponse = await executePrompt({
      contents: prompt,
      systemInstruction,
      isJson: true,
      temperature: 0.1,
      endpointName: 'feedback_ai_summary'
    });

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseErr) {
      // Try to extract JSON from the response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (error) {
    console.error('feedbackController.getAISummary error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate AI summary.'
    });
  }
};

/**
 * Get feedback statistics (aggregation)
 * @route   GET /api/feedback/stats
 * @access  Private
 */
const getFeedbackStats = async (req, res) => {
  try {
    const [
      totalCount,
      avgRatingResult,
      categoryDistribution,
      featureRatings,
      ratingHistogram,
      implementedFeedback,
      recentFeedback
    ] = await Promise.all([
      // Total feedback count
      Feedback.countDocuments(),

      // Overall average rating
      Feedback.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),

      // Count per category
      Feedback.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Average rating per feature
      Feedback.aggregate([
        {
          $group: {
            _id: '$featureName',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        },
        { $sort: { avgRating: -1 } }
      ]),

      // Rating distribution (1-5)
      Feedback.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Feedback marked as implemented
      Feedback.find({ status: 'implemented' })
        .populate('userId', 'name')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),

      // Recent feedback (last 10)
      Feedback.find({})
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCount,
        avgRating: avgRatingResult[0]?.avgRating || 0,
        categoryDistribution: categoryDistribution.map(c => ({
          category: c._id,
          count: c.count
        })),
        featureRatings: featureRatings.map(f => ({
          feature: f._id,
          avgRating: Math.round(f.avgRating * 10) / 10,
          count: f.count
        })),
        ratingHistogram: ratingHistogram.map(r => ({
          rating: r._id,
          count: r.count
        })),
        implementedFeedback,
        recentFeedback
      }
    });
  } catch (error) {
    console.error('feedbackController.getFeedbackStats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch feedback stats.'
    });
  }
};

/**
 * Update feedback status (implemented / reviewed / dismissed)
 * @route   PATCH /api/feedback/:id/status
 * @access  Private
 */
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'reviewed', 'implemented', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Feedback status updated to "${status}".`,
      data: feedback
    });
  } catch (error) {
    console.error('feedbackController.updateFeedbackStatus error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update feedback status.'
    });
  }
};

module.exports = {
  submitFeedback,
  getAllFeedback,
  getAISummary,
  getFeedbackStats,
  updateFeedbackStatus
};
