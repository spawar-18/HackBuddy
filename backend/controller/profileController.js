const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile skills and complete profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { skills } = req.body;

    // Validation: Ensure skills is provided and is an array
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array of strings' });
    }

    // Validation: Ensure all elements in skills array are strings
    const allStrings = skills.every(item => typeof item === 'string');
    if (!allStrings) {
      return res.status(400).json({ message: 'All skills must be strings' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set unique skills, removing potential duplicates and trimming
    const uniqueSkills = [...new Set(skills.map(s => s.trim()))].filter(s => s.length > 0);

    user.skills = uniqueSkills;
    user.profileCompleted = true;
    
    await user.save();

    // Auto-invalidate team analysis and cache for all teams this user belongs to
    try {
      const Team = require('../models/Team');
      const Project = require('../models/Project');
      const CacheManager = require('../services/ai/CacheManager');
      const userTeams = await Team.find({ members: user._id });
      for (const team of userTeams) {
        team.analysis = null;
        team.analysisGeneratedAt = null;
        team.analysisVersion = (team.analysisVersion || 0) + 1;
        await team.save();
      }
      const projects = await Project.find({ teamId: { $in: userTeams.map(t => t._id) } });
      for (const proj of projects) {
        CacheManager.invalidate(proj._id);
      }
      await Project.updateMany(
        { teamId: { $in: userTeams.map(t => t._id) } },
        { $set: { taskPlan: null, taskPlanGeneratedAt: null } }
      );
    } catch (teamErr) {
      console.error('Failed to invalidate team analysis on skill update:', teamErr);
    }

    // Remove password field before returning response
    const userResponse = JSON.parse(JSON.stringify(user));
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload resume, parse text, extract skills, and save resume path
// @route   POST /api/profile/upload-resume
// @access  Private
exports.uploadResume = async (req, res) => {
  const fs = require('fs');
  const pdfParse = require('pdf-parse');
  const { extractSkillsFromResume } = require('../services/openRouterService');

  try {
    // 1. Verify file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded.' });
    }

    const filePath = req.file.path;

    // 2. Parse text from PDF
    let resumeText = '';
    try {
      const dataBuffer = fs.readFileSync(filePath);
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(dataBuffer);
        resumeText = data.text;
      } else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        const result = await parser.getText();
        resumeText = result.text;
      } else {
        throw new Error('Unsupported pdf-parse module structure');
      }
    } catch (parseError) {
      console.error('PDF parsing failed:', parseError);
      // Clean up uploaded file on failure
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'Failed to parse PDF resume text.' });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'The uploaded PDF appears to be empty or unreadable.' });
    }

    // 3. Extract skills using OpenRouter AI service
    let extractedSkills = [];
    try {
      extractedSkills = await extractSkillsFromResume(resumeText);
    } catch (aiError) {
      console.error('AI Skill Extraction failed:', aiError);
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(502).json({ message: 'AI skill extraction service encountered an error.' });
    }

    // 4. Save resume URL to user profile
    const relativeUrl = `/uploads/resumes/${req.file.filename}`;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: 'User not found' });
    }

    user.resumeUrl = relativeUrl;
    await user.save();

    res.json({
      success: true,
      resumeUrl: relativeUrl,
      extractedSkills: extractedSkills
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    // Cleanup if file exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error during resume processing.' });
  }
};
