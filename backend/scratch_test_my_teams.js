require('dotenv').config();
const mongoose = require('mongoose');
const { getMyTeams } = require('./controller/teamController');

async function testMyTeams() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const userIds = [
    { id: '6a265746b1a1c29afedf3e69', name: 'Sahil Ojha (gmail)' },
    { id: '6a2e2a3e500d637c3f46a2fa', name: 'SAHIL OJHA_231080 (student)' }
  ];

  for (const user of userIds) {
    console.log(`\nTesting user: ${user.name} (${user.id})`);
    
    // Mock req and res
    const req = {
      user: { id: user.id }
    };
    
    let responseData = null;
    let responseStatus = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await getMyTeams(req, res);
    console.log(`Response Status: ${responseStatus}`);
    console.log(`Response Data length: ${responseData ? responseData.length : 'null'}`);
    if (responseData) {
      responseData.forEach(t => {
        console.log(` - Team: id=${t._id}, name=${t.teamName}, membersCount=${t.members ? t.members.length : 0}`);
      });
    }
  }

  await mongoose.disconnect();
}

testMyTeams().catch(console.error);
