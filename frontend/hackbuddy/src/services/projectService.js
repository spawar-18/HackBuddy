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

/**
 * Request task reassignment.
 * @param {string} projectId 
 * @param {string} taskId 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
export const requestReassignment = async (projectId, taskId, reason) => {
  const response = await api.post('/tasks/request-reassignment', { projectId, taskId, reason });
  return response.data;
};

/**
 * Request task swap.
 * @param {string} projectId 
 * @param {string} taskId 
 * @param {string} targetUser 
 * @param {string} targetTaskId 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
export const requestSwap = async (projectId, taskId, targetUser, targetTaskId, reason) => {
  const response = await api.post('/tasks/request-swap', { projectId, taskId, targetUser, targetTaskId, reason });
  return response.data;
};

/**
 * Request collaborator.
 * @param {string} projectId 
 * @param {string} taskId 
 * @param {string} targetUser 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
export const requestCollaborator = async (projectId, taskId, targetUser, reason) => {
  const response = await api.post('/tasks/request-collaborator', { projectId, taskId, targetUser, reason });
  return response.data;
};

/**
 * Request task help from a selected teammate.
 * @param {string} projectId
 * @param {string} taskId
 * @param {string} targetUser
 * @param {string} reason
 * @param {Array<string>} currentBlockers
 * @param {number} estimatedEffort
 * @returns {Promise<Object>}
 */
export const requestHelp = async (projectId, taskId, targetUser, reason, currentBlockers = [], estimatedEffort = 0) => {
  const response = await api.post('/tasks/request-help', {
    projectId,
    taskId,
    targetUser,
    reason,
    currentBlockers,
    estimatedEffort
  });
  return response.data;
};

/**
 * Claim available task.
 * @param {string} projectId 
 * @param {string} taskId 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
export const claimTask = async (projectId, taskId, reason) => {
  const response = await api.post('/tasks/claim-task', { projectId, taskId, reason });
  return response.data;
};

/**
 * Get project marketplace requests and available tasks.
 * @param {string} projectId 
 * @returns {Promise<Object>}
 */
export const getMarketplace = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/marketplace`);
  return response.data;
};

/**
 * Approve a marketplace request (owner only).
 * @param {string} requestId 
 * @returns {Promise<Object>}
 */
export const approveMarketplaceRequest = async (requestId) => {
  const response = await api.patch(`/marketplace/${requestId}/approve`);
  return response.data;
};

/**
 * Reject a marketplace request (owner only).
 * @param {string} requestId 
 * @returns {Promise<Object>}
 */
export const rejectMarketplaceRequest = async (requestId) => {
  const response = await api.patch(`/marketplace/${requestId}/reject`);
  return response.data;
};/**
 * Get tech stack details (proposal, votes, analysis, final stack)
 * @param {string} projectId 
 */
export const getTechStackDetails = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/tech-stack`);
  return response.data;
};

/**
 * Propose a tech stack
 * @param {string} projectId 
 * @param {Object} data - { frontend, backend, database, ai, deployment }
 */
export const proposeTechStack = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/tech-stack/proposal`, data);
  return response.data;
};

/**
 * Submit vote on the proposed stack
 * @param {string} projectId 
 * @param {Object} data - { voteType, confidenceScores, reason, suggestedAlternatives }
 */
export const submitTechStackVote = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/tech-stack/vote`, data);
  return response.data;
};

/**
 * Add tech stack category-specific comment
 * @param {string} projectId 
 * @param {Object} data - { category, comment }
 */
export const addTechStackComment = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/tech-stack/comment`, data);
  return response.data;
};

/**
 * Generate AI tech stack consensus analysis
 * @param {string} projectId 
 */
export const analyzeTechStack = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/tech-stack/analyze`);
  return response.data;
};

/**
 * Finalize the tech stack (owner only)
 * @param {string} projectId 
 * @param {Object} data - { action, modifiedStack }
 */
export const finalizeTechStack = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/tech-stack/finalize`, data);
  return response.data;
};

/**
 * Gets hackathon configuration.
 * @param {string} projectId
 */
export const getHackathonConfig = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/hackathon/config`);
  return response.data;
};

/**
 * Saves hackathon configuration.
 * @param {string} projectId
 * @param {Object} data
 */
export const saveHackathonConfig = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/hackathon/config`, data);
  return response.data;
};

/**
 * Gets aggregated Hackathon Command Center details.
 * @param {string} projectId
 */
export const getCommandCenterDashboard = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/hackathon/dashboard`);
  return response.data;
};

/**
 * Triggers AI Hackathon Command Center review.
 * @param {string} projectId
 */
export const triggerCommandCenterAnalysis = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/hackathon/analyze`);
  return response.data;
};

/**
 * Gets in-app notifications.
 * @param {string} projectId
 */
export const getInAppNotifications = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/hackathon/notifications`);
  return response.data;
};

/**
 * Marks notifications as read.
 * @param {string} projectId
 */
export const markNotificationsAsRead = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/hackathon/notifications/read`);
  return response.data;
};

/**
 * Connects a GitHub repository to a project.
 * @param {string} projectId 
 * @param {Object} data - { owner, repository, defaultBranch, repositoryUrl }
 */
export const connectGitHubRepository = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/hackathon/github/connect`, data);
  return response.data;
};

/**
 * Disconnects a GitHub repository from a project.
 * @param {string} projectId 
 */
export const disconnectGitHubRepository = async (projectId) => {
  const response = await api.delete(`/projects/${projectId}/hackathon/github/disconnect`);
  return response.data;
};

/**
 * Gets repository sync and commit analytics.
 * @param {string} projectId 
 */
export const getRepositoryAnalytics = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/hackathon/github/analytics`);
  return response.data;
};

/**
 * Performs manual synchronization of repository data.
 * @param {string} projectId 
 */
export const manualSyncRepository = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/hackathon/github/sync`);
  return response.data;
};

/**
 * Triggers AI repo structure and quality analysis.
 * @param {string} projectId 
 */
export const triggerGitHubAIAnalysis = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/hackathon/github/analyze`);
  return response.data;
};

/**
 * Gets AI task alignment reality check assessment.
 * @param {string} projectId 
 */
export const getProjectRealityCheck = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/hackathon/github/reality-check`);
  return response.data;
};
