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

/**
 * Triggers AI project review analysis.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, projectReview, projectReviewGeneratedAt }
 */
export const analyzeProject = async (projectId) => {
  const response = await api.post(`/project/${projectId}/analyze`);
  return response.data;
};

/**
 * Fetches previous project chat history.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, messages }
 */
export const getChatHistory = async (projectId) => {
  const response = await api.get(`/project/${projectId}/chat`);
  return response.data;
};

/**
 * Sends a message to the AI Mentor.
 * @param {string} projectId - Project ID
 * @param {string} message - User question
 * @returns {Promise<Object>} { success, userMessage, assistantMessage }
 */
export const sendChatMessage = async (projectId, message) => {
  const response = await api.post(`/project/${projectId}/chat`, { message });
  return response.data;
};

/**
 * Generates project task plan.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, taskPlan, taskPlanGeneratedAt }
 */
export const generateTaskPlan = async (projectId) => {
  const response = await api.post(`/project/${projectId}/generate-task-plan`);
  return response.data;
};

/**
 * Regenerates project task plan.
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} { success, taskPlan, taskPlanGeneratedAt }
 */
export const regenerateTaskPlan = async (projectId) => {
  const response = await api.post(`/project/${projectId}/regenerate-task-plan`);
  return response.data;
};

/**
 * Updates status of a task.
 * @param {string} projectId - Project ID
 * @param {Object} data - { memberName, taskName, status }
 * @returns {Promise<Object>} { success, taskPlan }
 */
export const updateTaskStatus = async (projectId, data) => {
  const response = await api.patch(`/project/${projectId}/task-plan/task-status`, data);
  return response.data;
};

