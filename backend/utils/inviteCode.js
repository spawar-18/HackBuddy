const Team = require('../models/Team');

/**
 * Generates a unique 6-character uppercase invite code.
 * @returns {Promise<string>} A unique 6-character invite code.
 */
const generateInviteCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  let attempts = 0;
  
  while (!isUnique && attempts < 100) {
    attempts++;
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if inviteCode is already used in Team
    const existingTeam = await Team.findOne({ inviteCode: code });
    if (!existingTeam) {
      isUnique = true;
    }
  }
  
  return code;
};

module.exports = { generateInviteCode };
