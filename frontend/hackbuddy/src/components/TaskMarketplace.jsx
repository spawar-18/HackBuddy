import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  ShoppingBag, ArrowLeftRight, UserPlus, RefreshCw, Check, X, 
  Shield, Users, BarChart3, AlertCircle, Play, CheckCircle, 
  Clock, Cpu, Award, MessageSquare, ChevronRight, HelpCircle, Star
} from 'lucide-react';
import { 
  requestReassignment,
  requestSwap,
  requestCollaborator,
  requestHelp,
  claimTask,
  getMarketplace,
  approveMarketplaceRequest,
  rejectMarketplaceRequest
} from '../services/projectService';
import { getTeamDetails } from '../services/teamService';

const TaskMarketplace = ({ projectId, teamId, onRefreshProject }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-tasks'); // 'my-tasks', 'marketplace', 'pending-requests'
  const [marketplaceData, setMarketplaceData] = useState({
    requests: [],
    incomingRequests: [],
    outgoingRequests: [],
    history: [],
    availableTasks: [],
    assignments: [],
    workloadDistribution: [],
    epics: [],
    filters: {},
    isOwner: false
  });
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Loading states for actions
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'reassign', 'swap', 'collab', 'help', 'claim'
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Form values
  const [reason, setReason] = useState('');
  const [targetMember, setTargetMember] = useState('');
  const [targetTask, setTargetTask] = useState('');
  const [blockers, setBlockers] = useState('');
  const [filterFeature, setFilterFeature] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Fetch all marketplace data and team details
  const fetchMarketplaceData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [resMarket, resTeam] = await Promise.all([
        getMarketplace(projectId),
        getTeamDetails(teamId)
      ]);

      if (resMarket.success) {
        setMarketplaceData({
          requests: resMarket.requests || [],
          incomingRequests: resMarket.incomingRequests || [],
          outgoingRequests: resMarket.outgoingRequests || [],
          history: resMarket.history || [],
          availableTasks: resMarket.availableTasks || [],
          assignments: resMarket.assignments || [],
          workloadDistribution: resMarket.workloadDistribution || [],
          epics: resMarket.epics || [],
          filters: resMarket.filters || {},
          isOwner: resMarket.isOwner
        });
      }
      setTeam(resTeam);
    } catch (err) {
      console.error('Error fetching marketplace details:', err);
      toast.error('Failed to load marketplace information.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && teamId) {
      fetchMarketplaceData();
    }
  }, [projectId, teamId]);

  // Find user's tasks
  const myTasks = useMemo(() => {
    if (!user || !marketplaceData.assignments) return [];
    const myAssignment = marketplaceData.assignments.find(
      a => a.member.toLowerCase() === user.name.toLowerCase()
    );
    return myAssignment ? myAssignment.assignedTasks || [] : [];
  }, [user, marketplaceData.assignments]);

  // List of other team members
  const otherTeamMembers = useMemo(() => {
    if (!team || !user) return [];
    return (team.members || []).filter(
      m => m.name.toLowerCase() !== user.name.toLowerCase()
    );
  }, [team, user]);

  // Tasks of the selected target user for swap
  const targetUserTasks = useMemo(() => {
    if (!targetMember || !marketplaceData.assignments) return [];
    const targetAssign = marketplaceData.assignments.find(
      a => a.member.toLowerCase() === targetMember.toLowerCase()
    );
    return targetAssign ? (targetAssign.assignedTasks || []).filter(t => t.marketplaceStatus === 'Locked') : [];
  }, [targetMember, marketplaceData.assignments]);

  const openRequestModal = (type, task) => {
    setSelectedTask(task);
    setReason('');
    setTargetMember('');
    setTargetTask('');
    setBlockers('');
    setActiveModal(type);
  };

  const closeRequestModal = () => {
    setActiveModal(null);
    setSelectedTask(null);
    setReason('');
    setTargetMember('');
    setTargetTask('');
    setBlockers('');
  };

  // Create Reassignment Request
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error('Please specify a reason');

    try {
      setActionStatus('Creating Request...');
      setActionLoading(true);
      const res = await requestReassignment(projectId, selectedTask.task, reason.trim());
      if (res.success) {
        toast.success('Reassignment request created successfully!');
        closeRequestModal();
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reassignment request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Swap Request
  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    if (!targetMember) return toast.error('Please select a teammate');
    if (!targetTask) return toast.error('Please select a task to swap');
    if (!reason.trim()) return toast.error('Please specify a reason');

    try {
      setActionStatus('Creating Request...');
      setActionLoading(true);
      const res = await requestSwap(projectId, selectedTask.task, targetMember, targetTask, reason.trim());
      if (res.success) {
        toast.success('Swap request created successfully!');
        closeRequestModal();
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Swap request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Collaborator Request
  const handleCollabSubmit = async (e) => {
    e.preventDefault();
    if (!targetMember) return toast.error('Please select a teammate');
    if (!reason.trim()) return toast.error('Please specify a reason');

    try {
      setActionStatus('Creating Request...');
      setActionLoading(true);
      const res = await requestCollaborator(projectId, selectedTask.task, targetMember, reason.trim());
      if (res.success) {
        toast.success('Collaborator request created successfully!');
        closeRequestModal();
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Collaborator request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    if (!targetMember) return toast.error('Please select a teammate');
    if (!reason.trim()) return toast.error('Please describe the help needed');

    try {
      setActionStatus('Creating Help Request...');
      setActionLoading(true);
      const currentBlockers = blockers
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
      const res = await requestHelp(
        projectId,
        selectedTask.task,
        targetMember,
        reason.trim(),
        currentBlockers,
        selectedTask.estimatedHours || 0
      );
      if (res.success) {
        toast.success('Help request sent to selected teammate!');
        closeRequestModal();
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Help request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Claim Task
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error('Please specify a reason');

    try {
      setActionStatus('Analyzing Request...');
      setActionLoading(true);
      const res = await claimTask(projectId, selectedTask.task, reason.trim());
      if (res.success) {
        toast.success('Claim request submitted successfully!');
        closeRequestModal();
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Claim request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Request (Owner Only)
  const handleApprove = async (requestId) => {
    try {
      setActionStatus('Approving Request...');
      setActionLoading(true);
      const res = await approveMarketplaceRequest(requestId);
      if (res.success) {
        toast.success('Request approved successfully!');
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Request (Owner Only)
  const handleReject = async (requestId) => {
    try {
      setActionStatus('Rejecting Request...');
      setActionLoading(true);
      const res = await rejectMarketplaceRequest(requestId);
      if (res.success) {
        toast.success('Request rejected successfully');
        await fetchMarketplaceData(false);
        if (onRefreshProject) onRefreshProject();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate predicted workloads for a given request
  const calculatePredictedWorkload = (request) => {
    const { requestType, requestedBy, targetUser } = request;
    const currentList = marketplaceData.workloadDistribution || [];
    
    // Fallback if no workload
    if (currentList.length === 0) return [];

    // Assignments map to count tasks
    const countMap = {};
    marketplaceData.assignments.forEach(a => {
      countMap[a.member] = (a.assignedTasks || []).length;
    });

    const totalTasks = Object.values(countMap).reduce((sum, v) => sum + v, 0);

    if (requestType === 'REASSIGNMENT') {
      // Current owner loses 1 task, task becomes Available (unassigned)
      if (countMap[requestedBy] > 0) countMap[requestedBy] -= 1;
    } else if (requestType === 'CLAIM') {
      // Claimer gains 1 task, and whoever had it (if any) loses 1.
      // Wait, claims come from Available tasks (which are unassigned).
      // So the claimer gets assigned the task, total count remains totalTasks.
      countMap[requestedBy] = (countMap[requestedBy] || 0) + 1;
    } else if (requestType === 'SWAP') {
      // Swapping tasks doesn't change task counts, so predicted workloads remain identical
    } else if (requestType === 'COLLABORATOR' || requestType === 'COLLABORATION' || requestType === 'HELP') {
      // Collaborator doesn't change ownership, counts remain identical
    }

    const newTotal = Object.values(countMap).reduce((sum, v) => sum + v, 0);
    if (newTotal === 0) return currentList.map(item => ({ ...item, predictedPercentage: 0 }));

    return currentList.map(item => {
      const count = countMap[item.member] || 0;
      return {
        ...item,
        predictedPercentage: Math.round((count / newTotal) * 100)
      };
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Locked': 'bg-neutral-100 text-neutral-600 border-neutral-200',
      'Available': 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse',
      'SwapRequested': 'bg-violet-50 text-violet-700 border-violet-200',
      'ClaimRequested': 'bg-blue-50 text-blue-700 border-blue-200',
      'ReassignmentRequested': 'bg-amber-50 text-amber-700 border-amber-200',
      'CollaborationRequested': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'HelpRequested': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    const labels = {
      'Locked': 'Assigned',
      'Available': 'Open for Claim',
      'SwapRequested': 'Swap Pending',
      'ClaimRequested': 'Claim Pending',
      'ReassignmentRequested': 'Release Pending',
      'CollaborationRequested': 'Collab Pending',
      'HelpRequested': 'Help Pending'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badges[status] || badges['Locked']}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (taskText, explicitPriority) => {
    // Determine priority mock based on task text
    let priority = explicitPriority || 'Medium';
    let color = 'bg-blue-50 text-blue-700 border-blue-150';
    if (taskText.toLowerCase().includes('deploy') || taskText.toLowerCase().includes('database') || taskText.toLowerCase().includes('auth')) {
      priority = 'High';
      color = 'bg-rose-50 text-rose-700 border-rose-150';
    } else if (taskText.toLowerCase().includes('doc') || taskText.toLowerCase().includes('test')) {
      priority = 'Low';
      color = 'bg-neutral-50 text-neutral-600 border-neutral-200';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${color}`}>
        {priority}
      </span>
    );
  };

  const filteredMyTasks = useMemo(() => {
    return myTasks.filter(task => {
      const featureOk = filterFeature === 'All' || task.featureName === filterFeature || task.epic === filterFeature;
      const statusOk = filterStatus === 'All' || task.status === filterStatus || task.marketplaceStatus === filterStatus;
      return featureOk && statusOk;
    });
  }, [myTasks, filterFeature, filterStatus]);

  const pendingRequestsCount = useMemo(() => {
    return marketplaceData.requests.filter(r => r.status === 'Pending').length;
  }, [marketplaceData.requests]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500 bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Loading Marketplace...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up relative">
      
      {/* Loading Overlay */}
      {actionLoading && (
        <div className="absolute inset-0 bg-neutral-900/10 backdrop-blur-2xs z-50 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-neutral-200 flex items-center gap-3">
            <RefreshCw className="animate-spin text-indigo-600" size={18} />
            <span className="text-xs font-bold text-neutral-800">{actionStatus || 'Processing...'}</span>
          </div>
        </div>
      )}

      {/* Intro Banner */}
      <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-200/20 border border-brand-200 text-brand-400">
                <ShoppingBag size={10} /> Task Marketplace
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-550">Negotiation & Claim Center</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-neutral-800">Collaborative Task Marketplace</h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-[650px] leading-relaxed">
              Negotiate tasks with teammates, claim open work items, swap assignments, and request assistance. 
              The AI Technical Manager evaluates all requests, with final approvals determined by the Squad Leader.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-1 p-1 bg-neutral-100/60 rounded-xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('my-tasks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === 'my-tasks'
              ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-black'
              : 'text-neutral-550 hover:text-neutral-800'
          }`}
        >
          <Star size={13} className={activeTab === 'my-tasks' ? 'text-indigo-600' : 'text-neutral-450'} />
          <span>My Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === 'marketplace'
              ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-black'
              : 'text-neutral-550 hover:text-neutral-800'
          }`}
        >
          <ShoppingBag size={13} className={activeTab === 'marketplace' ? 'text-emerald-600' : 'text-neutral-450'} />
          <span>Marketplace Board</span>
        </button>

        <button
          onClick={() => setActiveTab('pending-requests')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === 'pending-requests'
              ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-black'
              : 'text-neutral-550 hover:text-neutral-800'
          }`}
        >
          <Cpu size={13} className={activeTab === 'pending-requests' ? 'text-purple-600' : 'text-neutral-450'} />
          <span>Pending Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 ml-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white leading-none">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        {[
          { id: 'incoming', label: 'Incoming', count: marketplaceData.incomingRequests?.length || 0, icon: MessageSquare },
          { id: 'outgoing', label: 'Outgoing', count: marketplaceData.outgoingRequests?.length || 0, icon: Play },
          { id: 'history', label: 'History', count: marketplaceData.history?.length || 0, icon: Clock }
        ].map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === id
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-black'
                : 'text-neutral-550 hover:text-neutral-800'
            }`}
          >
            <Icon size={13} className={activeTab === id ? 'text-blue-600' : 'text-neutral-450'} />
            <span>{label}</span>
            {count > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 ml-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white leading-none">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'my-tasks' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">My Assigned Tasks</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Manage, reassign, swap, or request help for your tasks</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterFeature}
                onChange={(e) => setFilterFeature(e.target.value)}
                className="input-field text-xs py-2 pr-8"
              >
                <option value="All">All Features</option>
                {(marketplaceData.filters?.features || []).map(feature => (
                  <option key={feature} value={feature}>{feature}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field text-xs py-2 pr-8"
              >
                <option value="All">All Status</option>
                {['Not Started', 'In Progress', 'Blocked', 'Completed', 'Locked', 'HelpRequested', 'CollaborationRequested'].map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <span className="text-[10px] font-bold px-2 py-1 bg-indigo-55/60 text-indigo-700 rounded-md border border-indigo-100 font-mono">
                {filteredMyTasks.length} Shown
              </span>
            </div>
          </div>

          {filteredMyTasks.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white border border-neutral-200 rounded-2xl flex flex-col items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-200">
                <Star size={22} />
              </div>
              <div>
                <h4 className="font-bold text-neutral-800 text-sm">No Active Assignments</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-[320px] leading-normal">
                  You are not currently assigned any tasks. Browse the Marketplace Board to claim available tasks or volunteer!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMyTasks.map((task, idx) => {
                const status = task.marketplaceStatus || 'Locked';
                const isLocked = status === 'Locked';
                const taskStatus = task.status || 'Not Started';

                return (
                  <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between gap-4 shadow-2xs group">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {getPriorityBadge(task.task, task.priority)}
                        {getStatusBadge(status)}
                      </div>
                      
                      <h4 className="font-bold text-neutral-900 text-xs md:text-sm leading-relaxed group-hover:text-indigo-900 transition-colors">
                        {task.task}
                      </h4>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-neutral-50 border border-neutral-150 rounded-lg px-2.5 py-2">
                          <span className="block text-neutral-400 font-bold uppercase">Epic</span>
                          <span className="font-semibold text-neutral-700">{task.epic || task.featureName || 'General'}</span>
                        </div>
                        <div className="bg-neutral-50 border border-neutral-150 rounded-lg px-2.5 py-2">
                          <span className="block text-neutral-400 font-bold uppercase">Skill Match</span>
                          <span className="font-semibold text-neutral-700">{task.compatibilityScore || 50}%</span>
                        </div>
                      </div>

                      {(task.suggestedTechnologies?.length > 0 || task.suggestedSkills?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {(task.suggestedTechnologies || task.suggestedSkills || []).slice(0, 5).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}

                      {task.acceptanceCriteria?.length > 0 && (
                        <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3">
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Acceptance Criteria</span>
                          <ul className="mt-1.5 flex flex-col gap-1">
                            {task.acceptanceCriteria.slice(0, 3).map((item, itemIdx) => (
                              <li key={itemIdx} className="text-[10px] text-emerald-800 leading-normal flex gap-1.5">
                                <Check size={10} className="shrink-0 mt-0.5" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-[10px] text-neutral-405 font-bold uppercase tracking-wider mt-1 border-t border-neutral-100 pt-3">
                        <span>Task Status: <strong className={taskStatus === 'Completed' ? 'text-emerald-600' : taskStatus === 'In Progress' ? 'text-amber-600' : 'text-neutral-500'}>{taskStatus}</strong></span>
                        <span className="border-l border-neutral-200 pl-2">Hours: {task.estimatedHours || 0}</span>
                        <span className="border-l border-neutral-200 pl-2">Type: {task.category || 'Task'}</span>
                        {task.collaborators && task.collaborators.length > 0 && (
                          <span className="text-indigo-600 border-l border-neutral-200 pl-2">
                            Collaborators: {task.collaborators.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isLocked ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 border-t border-neutral-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openRequestModal('reassign', task)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 hover:border-amber-300 cursor-pointer transition-all duration-200"
                        >
                          <RefreshCw size={11} />
                          Reassign
                        </button>
                        <button
                          type="button"
                          onClick={() => openRequestModal('swap', task)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-bold border border-violet-200 hover:border-violet-300 cursor-pointer transition-all duration-200"
                        >
                          <ArrowLeftRight size={11} />
                          Swap Task
                        </button>
                        <button
                          type="button"
                          onClick={() => openRequestModal('collab', task)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 hover:border-blue-300 cursor-pointer transition-all duration-200"
                        >
                          <UserPlus size={11} />
                          Add Collab
                        </button>
                        <button
                          type="button"
                          onClick={() => openRequestModal('help', task)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 hover:border-rose-300 cursor-pointer transition-all duration-200"
                        >
                          <HelpCircle size={11} />
                          Need Help
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 border-t border-neutral-100 pt-3 bg-neutral-50 rounded-lg p-2.5 text-[11px] text-neutral-500 leading-normal flex items-start gap-2 border">
                        <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          Pending squad leader approval. This task is currently locked within the <strong>{status.replace('Requested', '')}</strong> flow.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'marketplace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Available Tasks Board */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Available Tasks</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Tasks released by team members, open for claiming or volunteering</p>
            </div>

            {marketplaceData.availableTasks.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white border border-neutral-200 rounded-2xl flex flex-col items-center gap-3 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-200">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-800 text-sm">Marketplace Board Empty</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-[340px] leading-normal">
                    There are no open tasks currently available for claiming. All assignments are locked in by teammates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {marketplaceData.availableTasks.map((item, idx) => (
                  <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-emerald-300 hover:shadow-sm transition-all duration-200 shadow-2xs">
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(item.task)}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 uppercase tracking-wider">Available</span>
                      </div>
                      <h4 className="font-bold text-neutral-900 text-xs md:text-sm leading-relaxed truncate">{item.task}</h4>
                      {item.assignedTo && (
                        <p className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Former Owner: <span className="text-neutral-600 font-semibold">{item.assignedTo}</span></p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openRequestModal('claim', item)}
                      className="btn-primary py-2 px-4 text-xs font-bold cursor-pointer shrink-0 self-end sm:self-auto shadow-2xs bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                    >
                      Claim Task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volunteer Mode Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Volunteer Mode</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Get involved in unassigned or critical tracks</p>
            </div>

            <div className="bg-gradient-to-b from-white to-slate-50 border border-neutral-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Award size={18} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Assistance Hub</h4>
              </div>
              
              <p className="text-xs text-neutral-550 leading-relaxed">
                Hackathons are team sports. If a teammate is struggling with a task, or you have extra bandwidth:
              </p>

              <div className="flex flex-col gap-3 mt-1.5">
                <div className="flex gap-2.5 items-start bg-white border border-neutral-150 p-3 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    <strong>Claim available tasks</strong> that have been released to maintain squad velocity.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start bg-white border border-neutral-150 p-3 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    Ask your teammates to add you as a <strong>Collaborator</strong> on critical items.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start bg-white border border-neutral-150 p-3 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5"></span>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    Use <strong>Swap Mode</strong> to exchange front-end/back-end assignments for optimal skill alignment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending-requests' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pending Requests</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Owner review console for task adjustments</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100 font-mono">
              {pendingRequestsCount} Pending
            </span>
          </div>

          {marketplaceData.requests.filter(r => r.status === 'Pending').length === 0 ? (
            <div className="text-center py-16 px-4 bg-white border border-neutral-200 rounded-2xl flex flex-col items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-200">
                <CheckCircle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-neutral-800 text-sm">No Pending Requests</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-[320px] leading-normal">
                  All requests have been processed. The project roadmap is fully balanced and synced.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {marketplaceData.requests
                .filter(r => r.status === 'Pending')
                .map((req, idx) => {
                  const predictedWorkload = calculatePredictedWorkload(req);
                  
                  return (
                    <div key={req._id || idx} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col border-l-4 border-l-purple-500">
                      
                      {/* Top banner of request card */}
                      <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                            req.requestType === 'SWAP' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            req.requestType === 'CLAIM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            req.requestType === 'REASSIGNMENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {req.requestType}
                          </span>
                          <span className="text-xs font-semibold text-neutral-600">
                            Requested by <strong className="text-neutral-800">{req.requestedBy}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Request Content */}
                      <div className="p-5 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-neutral-405 uppercase tracking-wider">Task Details</span>
                          <div className="p-3 bg-neutral-50 rounded-xl border flex flex-col gap-1.5">
                            <h4 className="text-xs md:text-sm font-bold text-neutral-900 leading-normal">{req.taskId}</h4>
                            
                            {/* Extra details based on request type */}
                            {req.requestType === 'SWAP' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-violet-700 font-semibold mt-1">
                                <ArrowLeftRight size={12} />
                                <span>Swapping with {req.targetUser}'s task: <strong className="text-violet-850 font-bold">{req.targetTaskId}</strong></span>
                              </div>
                            )}
                            {req.requestType === 'COLLABORATOR' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold mt-1">
                                <UserPlus size={12} />
                                <span>Adding teammate as collaborator: <strong className="text-indigo-850 font-bold">{req.targetUser}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {req.reason && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-405 uppercase tracking-wider">Requester Reason</span>
                            <blockquote className="bg-neutral-50/50 p-3.5 rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-600 italic leading-relaxed">
                              "{req.reason}"
                            </blockquote>
                          </div>
                        )}

                        {/* AI Recommendation Engine Card */}
                        {req.aiRecommendation && (
                          <div className="bg-gradient-to-b from-purple-50/30 to-purple-50/10 border border-purple-200/60 rounded-2xl p-4.5 flex flex-col gap-3.5">
                            <div className="flex justify-between items-center border-b border-purple-100 pb-2.5">
                              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                                <Cpu size={14} className="text-purple-600 animate-pulse" /> AI Decision Recommendation
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                req.aiRecommendation.recommendation === 'Approve'
                                  ? 'bg-emerald-100 text-emerald-805'
                                  : 'bg-rose-100 text-rose-805'
                              }`}>
                                {req.aiRecommendation.recommendation}
                              </span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                              {/* Confidence Gauge */}
                              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f3e8ff" strokeWidth="4.5" />
                                  <circle 
                                    cx="32" 
                                    cy="32" 
                                    r="28" 
                                    fill="transparent" 
                                    stroke={req.aiRecommendation.recommendation === 'Approve' ? '#10b981' : '#f43f5e'} 
                                    strokeWidth="4.5" 
                                    strokeDasharray={175.9}
                                    strokeDashoffset={175.9 - (req.aiRecommendation.confidenceScore / 100) * 175.9}
                                    className="transition-all duration-1000 ease-out"
                                  />
                                </svg>
                                <span className="absolute text-xs font-black text-purple-900 font-mono">
                                  {req.aiRecommendation.confidenceScore}%
                                </span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-purple-950 uppercase tracking-wide">Confidence Evaluation</h5>
                                <p className="text-[11px] text-purple-800 leading-normal mt-1">
                                  {req.aiRecommendation.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Workload Analysis Block */}
                        {predictedWorkload.length > 0 && (
                          <div className="border border-neutral-200/80 rounded-2xl p-4.5">
                            <h5 className="text-[10px] font-extrabold text-neutral-405 uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-neutral-100 pb-2">
                              <BarChart3 size={13} /> Workload Impact Projection
                            </h5>
                            
                            <div className="flex flex-col gap-3.5">
                              {predictedWorkload.map((w, wIdx) => {
                                const currentLoad = w.percentage || 0;
                                const predLoad = w.predictedPercentage !== undefined ? w.predictedPercentage : currentLoad;
                                const hasChanged = currentLoad !== predLoad;
                                
                                return (
                                  <div key={wIdx} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="font-bold text-neutral-750">{w.member}</span>
                                      <div className="font-mono font-bold flex items-center gap-1.5">
                                        <span className="text-neutral-500">{currentLoad}%</span>
                                        {hasChanged && (
                                          <>
                                            <ChevronRight size={10} className="text-neutral-400" />
                                            <span className={predLoad > currentLoad ? 'text-blue-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                                              {predLoad}%
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="h-2.5 bg-neutral-100 border border-neutral-200/50 rounded-full p-[1px] relative overflow-hidden flex">
                                      <div className="h-full bg-neutral-300 rounded-l-full transition-all duration-500" style={{ width: `${currentLoad}%` }}></div>
                                      {hasChanged && predLoad > currentLoad && (
                                        <div className="h-full bg-blue-500 rounded-r-full animate-pulse transition-all duration-500" style={{ width: `${predLoad - currentLoad}%` }}></div>
                                      )}
                                      {hasChanged && predLoad < currentLoad && (
                                        <div className="h-full bg-rose-400 opacity-60 rounded-r-full transition-all duration-500" style={{ width: `${currentLoad - predLoad}%` }}></div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Owner Decision Action Box */}
                        {((req.requestType === 'SWAP' || req.requestType === 'COLLABORATOR') 
                          ? (user && user.name && req.targetUser && user.name.toLowerCase() === req.targetUser.toLowerCase()) 
                          : marketplaceData.isOwner) ? (
                          <div className="flex gap-3 mt-2 border-t border-neutral-100 pt-4">
                            <button
                              type="button"
                              onClick={() => handleApprove(req._id)}
                              className="flex-1 btn-primary py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-700 cursor-pointer text-white flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <CheckCircle size={14} />
                              Approve Request
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(req._id)}
                              className="flex-1 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250 hover:border-rose-300 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <X size={14} />
                              Reject Request
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 border-t border-neutral-100 pt-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 text-[11px] font-semibold text-neutral-500 border">
                              <Shield size={12} className="text-neutral-400" />
                              {(req.requestType === 'SWAP' || req.requestType === 'COLLABORATOR') 
                                ? `Waiting for ${req.targetUser}'s decision approval` 
                                : `Waiting for owner's final decision approval`}
                            </span>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      {activeModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-up flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-150 flex justify-between items-center bg-neutral-50">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                {activeModal === 'reassign' && <RefreshCw size={15} className="text-amber-500" />}
                {activeModal === 'swap' && <ArrowLeftRight size={15} className="text-violet-500" />}
                {activeModal === 'collab' && <UserPlus size={15} className="text-blue-500" />}
                {activeModal === 'claim' && <ShoppingBag size={15} className="text-emerald-500" />}
                {activeModal === 'reassign' && 'Request Reassignment'}
                {activeModal === 'swap' && 'Request Task Swap'}
                {activeModal === 'collab' && 'Request Teammate Collaboration'}
                {activeModal === 'claim' && 'Claim Available Task'}
              </h3>
              <button 
                onClick={closeRequestModal}
                className="p-1 hover:bg-neutral-200 rounded text-neutral-450 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={
              activeModal === 'reassign' ? handleReassignSubmit :
              activeModal === 'swap' ? handleSwapSubmit :
              activeModal === 'collab' ? handleCollabSubmit :
              handleClaimSubmit
            } className="p-5 flex flex-col gap-4">
              
              {/* Task Display */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Task Selected</span>
                <div className="p-3 bg-neutral-50 rounded-xl border font-semibold text-xs text-neutral-800 leading-normal">
                  {selectedTask?.task}
                </div>
              </div>

              {/* Form inputs based on type */}
              {(activeModal === 'swap' || activeModal === 'collab') && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">
                    {activeModal === 'swap' ? 'Target Teammate' : 'Select Collaborator'}
                  </span>
                  <select
                    required
                    value={targetMember}
                    onChange={(e) => {
                      setTargetMember(e.target.value);
                      setTargetTask('');
                    }}
                    className="input-field text-xs py-2.5 pr-8"
                  >
                    <option value="">Choose Teammate...</option>
                    {otherTeamMembers.map(m => (
                      <option key={m._id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeModal === 'swap' && targetMember && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Teammate's Task to Swap</span>
                  {targetUserTasks.length === 0 ? (
                    <p className="text-xs text-rose-500 italic mt-0.5 border border-rose-100 bg-rose-50/20 p-2.5 rounded-lg">
                      {targetMember} has no swap-eligible assignments.
                    </p>
                  ) : (
                    <select
                      required
                      value={targetTask}
                      onChange={(e) => setTargetTask(e.target.value)}
                      className="input-field text-xs py-2.5 pr-8"
                    >
                      <option value="">Choose Task...</option>
                      {targetUserTasks.map((t, idx) => (
                        <option key={idx} value={t.task}>{t.task}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Reason Input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Reason / Motivation</span>
                <textarea
                  required
                  placeholder={
                    activeModal === 'reassign' ? 'e.g. I am not comfortable working with LLM APIs.' :
                    activeModal === 'swap' ? 'e.g. Stronger frontend skills.' :
                    activeModal === 'collab' ? 'e.g. Deployment is difficult.' :
                    'e.g. I have experience with AWS deployments and can take this on.'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field text-xs py-2 min-h-[90px] resize-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 mt-3 border-t border-neutral-100 pt-4 justify-end">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  className="py-2 px-4 text-xs font-bold text-neutral-600 hover:text-neutral-800 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activeModal === 'swap' && (!targetMember || !targetTask)}
                  className="btn-primary py-2 px-5 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default TaskMarketplace;
