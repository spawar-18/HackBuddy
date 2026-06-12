import api from './api';

/**
 * Creates a new team.
 * @param {Object} teamData - { teamName, description }
 * @returns {Promise<Object>} { success, team, inviteCode, inviteLink }
 */
export const createTeam = async (teamData) => {
  const response = await api.post('/team/create', teamData);
  return response.data;
};

/**
 * Joins a team using an invite code.
 * @param {string} inviteCode - 6 character uppercase invite code
 * @returns {Promise<Object>} { success, message, team }
 */
export const joinTeam = async (inviteCode) => {
  const response = await api.post('/team/join', { inviteCode });
  return response.data;
};

/**
 * Fetches all teams where the current user is a member.
 * @returns {Promise<Array>} List of teams
 */
export const getMyTeams = async () => {
  const response = await api.get('/team/my-teams');
  return response.data;
};

export const getTeamDetails = async (teamId) => {
  const response = await api.get(`/team/${teamId}`);
  return response.data;
};

/**
 * Leaves a team.
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>}
 */
export const leaveTeam = async (teamId) => {
  const response = await api.delete(`/team/${teamId}/leave`);
  return response.data;
};

/**
 * Removes a member from a team.
 * @param {string} teamId - Team ID
 * @param {string} memberId - Member ID
 * @returns {Promise<Object>}
 */
export const removeMember = async (teamId, memberId) => {
  const response = await api.delete(`/team/${teamId}/member/${memberId}`);
  return response.data;
};

/**
 * Transfers ownership of a team.
 * @param {string} teamId - Team ID
 * @param {string} newOwnerId - New owner's user ID
 * @returns {Promise<Object>}
 */
export const transferOwnership = async (teamId, newOwnerId) => {
  const response = await api.patch(`/team/${teamId}/transfer-owner`, { newOwnerId });
  return response.data;
};

/**
 * Deletes a team.
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>}
 */
export const deleteTeam = async (teamId) => {
  const response = await api.delete(`/team/${teamId}`);
  return response.data;
};

