import api from './api';

/**
 * Creates a new project.
 * @param {Object} projectData - { projectName, problemStatement, description, track, duration, featuresToBuild, teamId }
 * @returns {Promise<Object>} { success, project }
 */
export const createProject = async (projectData) => {
  const response = await api.post('/project', projectData);
  return response.data;
};

/**
 * Fetches the project linked to a team.
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} { success, project }
 */
export const getProjectByTeam = async (teamId) => {
  const response = await api.get(`/project/team/${teamId}`);
  return response.data;
};

/**
 * Fetches project details by project ID.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, project }
 */
export const getProject = async (projectId) => {
  const response = await api.get(`/project/${projectId}`);
  return response.data;
};

/**
 * Updates project details.
 * @param {string} projectId - Project ID
 * @param {Object} projectData - { projectName, problemStatement, description, track, duration, featuresToBuild, status }
 * @returns {Promise<Object>} { success, project }
 */
export const updateProject = async (projectId, projectData) => {
  const response = await api.put(`/project/${projectId}`, projectData);
  return response.data;
};

/**
 * Deletes a project.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, message }
 */
export const deleteProject = async (projectId) => {
  const response = await api.delete(`/project/${projectId}`);
  return response.data;
};
