require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const Team = require('./models/Team');
const User = require('./models/User');

async function dumpDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- USERS ---');
  const users = await User.find();
  users.forEach(u => {
    console.log(`User: ID=${u._id}, Name=${u.name}, Email=${u.email}`);
  });

  console.log('\n--- TEAMS ---');
  const teams = await Team.find();
  teams.forEach(t => {
    console.log(`Team: ID=${t._id}, Name=${t.teamName}, Members=[${t.members.join(', ')}], CreatedBy=${t.createdBy}`);
  });

  console.log('\n--- PROJECTS ---');
  const projects = await Project.find();
  projects.forEach(p => {
    console.log(`Project: ID=${p._id}, Name=${p.projectName}, TeamID=${p.teamId}, CreatedBy=${p.createdBy}`);
  });

  await mongoose.disconnect();
}

dumpDB().catch(console.error);
