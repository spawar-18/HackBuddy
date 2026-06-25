const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded;

    // Log the user details to persistent_calls.log
    try {
      const fs = require('fs');
      const path = require('path');
      const User = require('../models/User');
      
      User.findById(decoded.id).then(u => {
        if (u) {
          fs.appendFileSync(path.join(__dirname, '../persistent_calls.log'), `[${new Date().toISOString()}] Active request from user: id=${u._id}, name=${u.name}, email=${u.email}, endpoint=${req.originalUrl}\n`);
        } else {
          fs.appendFileSync(path.join(__dirname, '../persistent_calls.log'), `[${new Date().toISOString()}] Active request with user ID not found: id=${decoded.id}, endpoint=${req.originalUrl}\n`);
        }
      }).catch(err => {
        fs.appendFileSync(path.join(__dirname, '../persistent_calls.log'), `[${new Date().toISOString()}] Error loading user ID ${decoded.id}: ${err.message}\n`);
      });
    } catch (e) {}

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
