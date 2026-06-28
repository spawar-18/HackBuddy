require('./utils/sslFix');
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

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const teamRoutes = require('./routes/teamRoutes');
const teamAnalysisRoutes = require('./routes/teamAnalysisRoutes');
const projectRoutes = require('./routes/projectRoutes');
const chatRoutes = require('./routes/chatRoutes');
const teamChatRoutes = require('./routes/teamChatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const techStackRoutes = require('./routes/techStackRoutes');
const commandCenterRoutes = require('./routes/commandCenterRoutes');
const githubRoutes = require('./routes/githubRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 5000;

// ─── Socket.IO — WebRTC Signaling for Team Meet ──────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// rooms: { [teamId]: Set<socketId> }
const meetRooms = {};
// liveCalls: { [teamId]: { teamName, starterName, startedAt } }
const liveCalls = {};
// peerInfo: { [socketId]: { userId, userName, userAvatar, teamId, audioOn, videoOn } }
const peerInfo = {};

io.on('connection', (socket) => {
  // ── Join a team meet room ──────────────────────────────────────────────────
  socket.on('join-meet-room', ({ teamId, userId, userName, userAvatar }) => {
    socket.join(teamId);
    if (!meetRooms[teamId]) meetRooms[teamId] = new Set();
    meetRooms[teamId].add(socket.id);
    peerInfo[socket.id] = { userId, userName, userAvatar, teamId, audioOn: true, videoOn: true };

    // Tell the new joiner about all existing peers in the room
    const existing = [];
    meetRooms[teamId].forEach((id) => {
      if (id !== socket.id && peerInfo[id]) {
        existing.push({ socketId: id, ...peerInfo[id] });
      }
    });
    socket.emit('existing-peers', existing);

    // Broadcast to others that someone new joined
    socket.to(teamId).emit('peer-joined', {
      socketId: socket.id,
      userId,
      userName,
      userAvatar,
      audioOn: true,
      videoOn: true,
    });
  });

  // ── WebRTC Offer ───────────────────────────────────────────────────────────
  socket.on('webrtc-offer', ({ targetSocketId, offer, fromSocketId }) => {
    io.to(targetSocketId).emit('webrtc-offer', { offer, fromSocketId });
  });

  // ── WebRTC Answer ──────────────────────────────────────────────────────────
  socket.on('webrtc-answer', ({ targetSocketId, answer, fromSocketId }) => {
    io.to(targetSocketId).emit('webrtc-answer', { answer, fromSocketId });
  });

  // ── ICE Candidate ─────────────────────────────────────────────────────────
  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate, fromSocketId }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, fromSocketId });
  });

  // ── Media toggle (mic / camera) ───────────────────────────────────────────
  socket.on('toggle-media', ({ audioOn, videoOn }) => {
    if (peerInfo[socket.id]) {
      peerInfo[socket.id].audioOn = audioOn;
      peerInfo[socket.id].videoOn = videoOn;
      const teamId = peerInfo[socket.id].teamId;
      socket.to(teamId).emit('peer-media-toggle', { socketId: socket.id, audioOn, videoOn });
    }
  });

  // ── Leave room ────────────────────────────────────────────────────────────
  socket.on('leave-meet-room', () => {
    handleDisconnect(socket);
  });

  // ── Dashboard notification: meet started / ended ──────────────────────────
  // liveCalls: { [teamId]: { teamName, starterName, startedAt } }
  socket.on('meet-broadcast', ({ type, teamId, teamName, starterName }) => {
    if (type === 'started') {
      liveCalls[teamId] = { teamName, starterName, startedAt: new Date().toISOString() };
    } else if (type === 'ended') {
      delete liveCalls[teamId];
    }
    // Broadcast updated live-call map to ALL connected clients
    io.emit('live-call-update', { liveCalls });
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket) {
  const info = peerInfo[socket.id];
  if (!info) return;
  const { teamId } = info;
  if (meetRooms[teamId]) {
    meetRooms[teamId].delete(socket.id);
    if (meetRooms[teamId].size === 0) delete meetRooms[teamId];
  }
  delete peerInfo[socket.id];
  socket.to(teamId).emit('peer-left', { socketId: socket.id });
  socket.leave(teamId);
}
// ─────────────────────────────────────────────────────────────────────────────

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
app.use('/api/team-chat', teamChatRoutes);
app.use('/api/projects/:projectId/tech-stack', techStackRoutes);
app.use('/api/project/:projectId/tech-stack', techStackRoutes);
app.use('/api/projects/:projectId/hackathon', commandCenterRoutes);
app.use('/api/project/:projectId/hackathon', commandCenterRoutes);
app.use('/api/projects/:projectId/hackathon/github', githubRoutes);
app.use('/api/project/:projectId/hackathon/github', githubRoutes);
app.use('/api/projects/:projectId/verification', verificationRoutes);
app.use('/api/project/:projectId/verification', verificationRoutes);
app.use('/api', marketplaceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/subscription', subscriptionRoutes);

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
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  });