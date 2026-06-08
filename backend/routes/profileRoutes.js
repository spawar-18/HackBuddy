const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getProfile, updateProfile, uploadResume } = require('../controller/profileController');
const upload = require('../middleware/upload').single('resume');

// Wrapper middleware to handle Multer errors gracefully (e.g. file size limit or invalid type filter)
const handleResumeUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload error.' });
    }
    next();
  });
};

// All routes are protected by authMiddleware
router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.post('/upload-resume', authMiddleware, handleResumeUpload, uploadResume);

module.exports = router;
