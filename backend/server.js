require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const path = require('path');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const teamRoutes = require('./routes/teamRoutes');

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