const TaskMarketplaceRequest = require('../../models/TaskMarketplaceRequest');

/**
 * MarketplaceAnalyzer
 * Evaluates active swap requests, collaborator adds, reassignments, and history.
 */
class MarketplaceAnalyzer {
  async analyze(projectId) {
    try {
      const requests = await TaskMarketplaceRequest.find({ projectId });
      
      const pendingCount = requests.filter(r => r.status === 'Pending').length;
      const approvedCount = requests.filter(r => r.status === 'Approved').length;
      const activeSwaps = requests.filter(r => r.requestType === 'SWAP' && r.status === 'Pending').length;
      const activeCollaborations = requests.filter(r => (r.requestType === 'COLLABORATOR' || r.requestType === 'HELP') && r.status === 'Pending').length;

      const activitySummary = requests.slice(0, 10).map(r => ({
        _id: r._id,
        member: r.requestedBy || 'Teammate',
        task: r.taskName || r.taskId,
        requestType: r.requestType,
        status: r.status,
        createdAt: r.createdAt
      }));

      return {
        requestsCount: requests.length,
        pendingCount,
        approvedCount,
        activeSwaps,
        activeCollaborations,
        activitySummary
      };
    } catch (err) {
      console.warn('[MarketplaceAnalyzer] Error fetching marketplace data:', err.message);
      return {
        requestsCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        activeSwaps: 0,
        activeCollaborations: 0,
        activitySummary: []
      };
    }
  }
}

module.exports = new MarketplaceAnalyzer();
