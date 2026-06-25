require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'server_debug.log');

// Clear existing log file on start
try { fs.writeFileSync(logFile, ''); } catch (e) {}

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(...args);
  try {
    fs.appendFileSync(logFile, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n');
  } catch (e) {}
};

console.error = (...args) => {
  originalError(...args);
  try {
    fs.appendFileSync(logFile, '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n');
  } catch (e) {}
};

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const teamRoutes = require('./routes/teamRoutes');
const teamAnalysisRoutes = require('./routes/teamAnalysisRoutes');
const projectRoutes = require('./routes/projectRoutes');
const chatRoutes = require('./routes/chatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const techStackRoutes = require('./routes/techStackRoutes');
const commandCenterRoutes = require('./routes/commandCenterRoutes');
const githubRoutes = require('./routes/githubRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', teamAnalysisRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project', chatRoutes);
app.use('/api/projects', chatRoutes);
app.use('/api/projects/:projectId/tech-stack', techStackRoutes);
app.use('/api/project/:projectId/tech-stack', techStackRoutes);
app.use('/api/projects/:projectId/hackathon', commandCenterRoutes);
app.use('/api/project/:projectId/hackathon', commandCenterRoutes);
app.use('/api/projects/:projectId/hackathon/github', githubRoutes);
app.use('/api/project/:projectId/hackathon/github', githubRoutes);
app.use('/api/projects/:projectId/verification', verificationRoutes);
app.use('/api/project/:projectId/verification', verificationRoutes);
app.use('/api', marketplaceRoutes);

// Root Route (Welcome message/status)
app.get('/', (req, res) => {
  res.json({ message: 'HackBuddy API is running' });
});

// Connect to MongoDB Atlas
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('CRITICAL: MONGO_URI is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err);
    console.warn('WARNING: Could not connect to MongoDB Atlas. Falling back to In-Memory Database for local testing.');
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  });