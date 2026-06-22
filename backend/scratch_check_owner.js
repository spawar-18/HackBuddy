require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const Team = require('./models/Team');
const User = require('./models/User');

async function checkOwner() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const project = await Project.findOne();
  if (!project) {
    console.log('No project found');
    mongoose.disconnect();
    return;
  }

  const team = await Team.findById(project.teamId);
  const user = await User.findOne({ name: 'Sahil' });

  console.log('Project createdBy:', project.createdBy);
  console.log('Team createdBy:', team ? team.createdBy : 'N/A');
  console.log('User id:', user ? user._id : 'N/A');

  const isSameUser = (id1, id2) => {
    const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
    const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
    return s1 === s2;
  };

  console.log('Is project owner:', isSameUser(project.createdBy, user._id));
  console.log('Is team owner:', isSameUser(team.createdBy, user._id));

  mongoose.disconnect();
}

checkOwner();
