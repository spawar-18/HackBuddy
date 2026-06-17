import React, { useState, useEffect, useRef } from 'react';
import { 
  createProject, 
  getProjectByTeam, 
  updateProject, 
  deleteProject,
  analyzeProject,
  getChatHistory,
  sendChatMessage,
  generateTaskPlan,
  regenerateTaskPlan,
  updateTaskStatus
} from '../services/projectService';
import { toast } from 'react-hot-toast';
import { 
  FolderGit2, Plus, Trash2, Edit3, ListTodo, 
  Play, CheckCircle, Clock, ArrowLeft, Save, AlertTriangle, RefreshCw, Cpu,
  Layers, Users, Activity, Zap, BarChart3, GitBranch, Target, Star, ShieldAlert,
  ShoppingBag
} from 'lucide-react';
import TaskMarketplace from './TaskMarketplace';
import { useAuth } from '../context/AuthContext';


const parseInlineMarkdown = (text) => {
  if (!text) return '';
  // Simple replacement of **text** with strong elements
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
    }
    // Simple replacement of `code` with code styling
    const subParts = part.split(/(`.*?`)/g);
    return subParts.map((subPart, subIndex) => {
      if (subPart.startsWith('`') && subPart.endsWith('`')) {
        return (
          <code key={subIndex} style={{ 
            background: 'var(--bg-deep)', 
            padding: '2px 4px', 
            borderRadius: '4px', 
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--primary)'
          }}>
            {subPart.slice(1, -1)}
          </code>
        );
      }
      return subPart;
    });
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;

  // Split by newlines to process line by line
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let content = line.trim();
    
    // 1. Headers (###, ##, #)
    if (content.startsWith('### ')) {
      return (
        <h4 key={idx} style={{ fontWeight: 700, fontSize: '1rem', marginTop: '12px', marginBottom: '6px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(4))}
        </h4>
      );
    }
    if (content.startsWith('## ')) {
      return (
        <h3 key={idx} style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(3))}
        </h3>
      );
    }
    if (content.startsWith('# ')) {
      return (
        <h2 key={idx} style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: '16px', marginBottom: '10px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(2))}
        </h2>
      );
    }

    // 2. Unordered lists (- or *)
    if (content.startsWith('- ') || content.startsWith('* ')) {
      return (
        <ul key={idx} style={{ margin: '4px 0', paddingLeft: '1.2rem', listStyleType: 'disc' }}>
          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(content.slice(2))}
          </li>
        </ul>
      );
    }

    // 3. Numbered lists (1., 2., etc.)
    const numberedMatch = content.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      return (
        <ol key={idx} style={{ margin: '4px 0', paddingLeft: '1.2rem', listStyleType: 'decimal' }} start={numberedMatch[1]}>
          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(numberedMatch[2])}
          </li>
        </ol>
      );
    }

    // 4. Empty line
    if (content === '') {
      return <div key={idx} style={{ height: '8px' }} />;
    }

    // 5. Standard paragraph
    return (
      <p key={idx} style={{ fontSize: '0.88rem', margin: '4px 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};
const getStepMeta = (stepText) => {
  const text = (stepText || '').toLowerCase();
  if (text.includes('setup') || text.includes('repo') || text.includes('initial') || text.includes('environment')) {
    return { label: 'Environment Setup', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: FolderGit2 };
  }
  if (text.includes('database') || text.includes('schema') || text.includes('model') || text.includes('mongodb') || text.includes('sql')) {
    return { label: 'Database & Models', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Cpu };
  }
  if (text.includes('auth') || text.includes('login') || text.includes('api') || text.includes('backend') || text.includes('server') || text.includes('route') || text.includes('controller')) {
    return { label: 'Backend APIs', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Cpu };
  }
  if (text.includes('ui') || text.includes('page') || text.includes('screen') || text.includes('frontend') || text.includes('css') || text.includes('component') || text.includes('dashboard')) {
    return { label: 'UI & Components', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Layers };
  }
  if (text.includes('deploy') || text.includes('production') || text.includes('vercel') || text.includes('aws') || text.includes('host') || text.includes('render') || text.includes('publish')) {
    return { label: 'Deployment', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Zap };
  }
  return { label: 'Development Phase', color: 'bg-neutral-50 text-neutral-700 border-neutral-200', icon: Activity };
};

const ProjectHub = ({ teamId }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [splitterLoading, setSplitterLoading] = useState(false);
  const [splitterStatus, setSplitterStatus] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'edit'
  const [activeTaskPlanTab, setActiveTaskPlanTab] = useState('roadmap');
  const [hoveredMember, setHoveredMember] = useState(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll chat window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, chatLoading]);
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState('');
  const [duration, setDuration] = useState('');
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [status, setStatus] = useState('Planning');

  // Load project on mount/teamId change
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await getProjectByTeam(teamId);
        if (res.success && res.project) {
          setProject(res.project);
          setView('dashboard');
        } else {
          setProject(null);
          setView('create-prompt'); // Prompt to create project
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        toast.error('Failed to load project details.');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchProject();
    }
  }, [teamId]);

  // Sync edit form fields when entering edit view
  const enterEditMode = () => {
    if (project) {
      setProjectName(project.projectName);
      setProblemStatement(project.problemStatement);
      setDescription(project.description);
      setTrack(project.track);
      setDuration(project.duration);
      setFeatures(project.featuresToBuild || []);
      setNewFeature('');
      setStatus(project.status);
      setView('edit');
    }
  };

  // Sync create form fields
  const enterCreateMode = () => {
    setProjectName('');
    setProblemStatement('');
    setDescription('');
    setTrack('');
    setDuration('');
    setFeatures([]);
    setNewFeature('');
    setStatus('Planning');
    setView('create');
  };

  // Add a feature dynamically
  const handleAddFeature = (e) => {
    e.preventDefault();
    if (!newFeature.trim()) return;
    if (features.includes(newFeature.trim())) {
      toast.error('Feature already listed.');
      return;
    }
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  // Remove a feature dynamically
  const handleRemoveFeature = (indexToRemove) => {
    setFeatures(features.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRunAnalysis = async () => {
    if (!project) return;
    
    // Validation: Empty features list
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Empty features list: Please configure at least one feature before running project analysis.');
      return;
    }

    try {
      setReviewLoading(true);
      const isRegen = !!project.projectReview;
      const res = await analyzeProject(project._id);
      
      if (res.success) {
        setProject(prev => ({
          ...prev,
          projectReview: res.projectReview,
          projectReviewGeneratedAt: res.projectReviewGeneratedAt
        }));
        
        if (isRegen) {
          toast.success('Project review regenerated successfully.');
        } else {
          toast.success('Project review generated successfully.');
        }
        
        setView('review-report');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to analyze project.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleGenerateTaskPlan = async () => {
    if (!project) return;
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Please configure at least one feature before generating a task plan.');
      return;
    }

    let interval;
    try {
      setSplitterLoading(true);
      const statuses = [
        'Analyzing Project...',
        'Generating Task Plan...',
        'Assigning Tasks...',
        'Building Execution Strategy...'
      ];
      let index = 0;
      setSplitterStatus(statuses[0]);
      interval = setInterval(() => {
        index++;
        if (index < statuses.length) {
          setSplitterStatus(statuses[index]);
        }
      }, 1000);

      const res = await generateTaskPlan(project._id);
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan,
          taskPlanGeneratedAt: res.taskPlanGeneratedAt
        }));
        toast.success('Task plan generated successfully!');
        setView('task-plan');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate task plan.');
    } finally {
      clearInterval(interval);
      setSplitterLoading(false);
      setSplitterStatus('');
    }
  };

  const handleRegenerateTaskPlan = async () => {
    if (!project) return;
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Please configure at least one feature before regenerating the task plan.');
      return;
    }

    let interval;
    try {
      setSplitterLoading(true);
      const statuses = [
        'Analyzing Project...',
        'Generating Task Plan...',
        'Assigning Tasks...',
        'Building Execution Strategy...'
      ];
      let index = 0;
      setSplitterStatus(statuses[0]);
      interval = setInterval(() => {
        index++;
        if (index < statuses.length) {
          setSplitterStatus(statuses[index]);
        }
      }, 1000);

      const res = await regenerateTaskPlan(project._id);
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan,
          taskPlanGeneratedAt: res.taskPlanGeneratedAt
        }));
        toast.success('Task plan regenerated successfully!');
        setView('task-plan');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to regenerate task plan.');
    } finally {
      clearInterval(interval);
      setSplitterLoading(false);
      setSplitterStatus('');
    }
  };

  const handleUpdateTaskStatus = async (memberName, taskName, newStatus) => {
    if (!project) return;
    try {
      const res = await updateTaskStatus(project._id, {
        memberName,
        taskName,
        status: newStatus
      });
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update task status.');
    }
  };

  const openMentorChat = async () => {
    setView('mentor-chat');
    setChatError(null);
    try {
      setHistoryLoading(true);
      const res = await getChatHistory(project._id);
      if (res.success) {
        setChatMessages(res.messages || []);
      }
    } catch (err) {
      console.error(err);
      setChatError('Failed to load chat history. You can still send new messages.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendChatMessage = async (msgText) => {
    const textToSend = msgText || chatInput;
    if (!textToSend || !textToSend.trim()) return;
    if (chatLoading) return;

    setChatError(null);
    setChatLoading(true);
    
    // Optimistic update
    const tempUserMsg = {
      _id: 'temp_user_' + Date.now(),
      role: 'user',
      message: textToSend.trim(),
      createdAt: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');

    try {
      const res = await sendChatMessage(project._id, textToSend.trim());
      if (res.success) {
        // Replace temp message with saved messages
        setChatMessages(prev => {
          const filtered = prev.filter(m => !m._id.startsWith('temp_'));
          return [...filtered, res.userMessage, res.assistantMessage];
        });
      }
    } catch (err) {
      console.error(err);
      setChatError(err.response?.data?.message || 'Failed to send message to AI Mentor.');
      // Remove temp message on failure
      setChatMessages(prev => prev.filter(m => !m._id.startsWith('temp_')));
    } finally {
      setChatLoading(false);
    }
  };

  // Handle Create Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name is required.');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Problem statement is required.');
      return;
    }
    if (problemStatement.trim().length < 20) {
      toast.error('Problem statement must be at least 20 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      const projectData = {
        projectName: projectName.trim(),
        problemStatement: problemStatement.trim(),
        description: description.trim(),
        track: track.trim(),
        duration: duration.trim(),
        featuresToBuild: features,
        teamId
      };
      const res = await createProject(projectData);
      if (res.success) {
        setProject(res.project);
        toast.success('Project created successfully!');
        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Submit
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Problem statement is required.');
      return;
    }
    if (problemStatement.trim().length < 20) {
      toast.error('Problem statement must be at least 20 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      const projectData = {
        projectName: projectName.trim(),
        problemStatement: problemStatement.trim(),
        description: description.trim(),
        track: track.trim(),
        duration: duration.trim(),
        featuresToBuild: features,
        status
      };
      const res = await updateProject(project._id, projectData);
      if (res.success) {
        setProject(res.project);
        toast.success('Project updated successfully!');
        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? All project configurations will be permanently removed.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await deleteProject(project._id);
      if (res.success) {
        setProject(null);
        toast.success('Project deleted successfully.');
        setView('create-prompt');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'Planning':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
            <Clock size={12} /> Planning
          </span>
        );
      case 'In Progress':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700">
            <Play size={12} /> In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle size={12} /> Completed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="details-card flex flex-col justify-center items-center py-8 text-slate-400">
        <RefreshCw className="animate-spin text-primary mb-2" size={24} />
        <span className="text-xs font-semibold">Loading project hub...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <FolderGit2 size={20} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">Project Hub</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Manage project details, tracks, and features</p>
          </div>
        </div>
        {view === 'dashboard' && project && getStatusBadge(project.status)}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && project && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">{project.projectName}</h1>
            <div className="flex gap-4 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1.5">
              {project.track && <span>Track: <b className="text-brand-600">{project.track}</b></span>}
              {project.duration && <span>Duration: <b className="text-brand-600">{project.duration}</b></span>}
            </div>
          </div>

          {/* Problem Statement */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Problem Statement</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-red-500 rounded-lg p-4">
              <p className="text-xs font-semibold text-neutral-800 leading-relaxed">
                {project.problemStatement}
              </p>
            </div>
          </div>

          {project.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Description</span>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <p className="text-xs text-neutral-600 leading-relaxed">{project.description}</p>
              </div>
            </div>
          )}

          {/* Features Checklist */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Features Checklist</span>
            <div className="flex flex-col gap-2">
              {project.featuresToBuild && project.featuresToBuild.length > 0 ? (
                project.featuresToBuild.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-200/60 rounded-lg px-3 py-2 text-xs font-medium text-neutral-700">
                    <ListTodo size={14} className="text-brand-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic">
                  No features configured yet. Click Edit Project to add features.
                </p>
              )}
            </div>
          </div>

          {/* AI Project Review Trigger Block */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 border-l-4 border-l-brand-500 flex flex-col gap-3 mt-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-brand-500" />
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                AI Project Review
              </h3>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Analyze the project's feasibility, risks, scope, missing skills, and improvement opportunities.
            </p>
            
            {reviewLoading ? (
              <div className="flex items-center gap-2.5 py-1 text-neutral-500 text-xs">
                <RefreshCw className="animate-spin text-brand-500" size={14} />
                <span>Analyzing Project...</span>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap mt-1">
                {!project.projectReview ? (
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit"
                  >
                    Analyze Project
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('review-report')}
                      className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit"
                    >
                      View Review
                    </button>
                    <button
                      type="button"
                      onClick={openMentorChat}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer w-fit border-brand-200 bg-brand-50/20 text-brand-700 hover:bg-brand-50/40"
                    >
                      Open AI Mentor
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer w-fit"
                    >
                      Regenerate Review
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Task Splitter Trigger Block */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 border-l-4 border-l-purple-500 flex flex-col gap-3 mt-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-purple-500" />
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                AI Task Splitter
              </h3>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Decompose your project features, infer missing technical tasks, map roles to members, and generate a step-by-step roadmap.
            </p>
            
            {splitterLoading ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-100"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-[6px] rounded-full bg-purple-50 flex items-center justify-center">
                      <Cpu size={12} className="text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-700">{splitterStatus}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">This may take up to 2 minutes</p>
                  </div>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/5 bg-gradient-to-r from-purple-500 to-violet-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap mt-1">
                {!project.taskPlan ? (
                  <button
                    type="button"
                    onClick={handleGenerateTaskPlan}
                    className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit bg-purple-600 hover:bg-purple-700 border-purple-600"
                  >
                    Generate Task Plan
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('task-plan')}
                      className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit bg-purple-600 hover:bg-purple-700 border-purple-600"
                    >
                      View Task Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateTaskPlan}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer w-fit"
                    >
                      Regenerate Task Plan
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-neutral-100 pt-4 mt-2">
            <button 
              onClick={enterEditMode}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
              disabled={actionLoading}
            >
              <Edit3 size={14} /> Edit Project
            </button>
            <button 
              onClick={handleDeleteProject}
              className="btn-danger text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
              disabled={actionLoading}
            >
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>
      )}

      {/* AI Project Review Report View */}
      {view === 'review-report' && project && project.projectReview && (
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-brand-500" />
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                AI Project Review Report
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {project.projectReviewGeneratedAt && (
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mt-[-8px]">
              Generated: {new Date(project.projectReviewGeneratedAt).toLocaleString()}
            </div>
          )}

          {/* 1. Feasibility Score */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Feasibility Score</span>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-extrabold text-brand-500 font-mono">
                  {project.projectReview.feasibilityScore?.toFixed(1) || 'N/A'}<span className="text-sm text-neutral-400 font-normal"> / 10</span>
                </div>
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mt-1">
                  PROTOTYPE BUILD READINESS
                </div>
              </div>
              
              <div className="w-32 h-2 bg-neutral-200 rounded-full relative overflow-hidden border border-neutral-200/20">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (project.projectReview.feasibilityScore || 5) >= 8 
                      ? 'bg-emerald-500' 
                      : (project.projectReview.feasibilityScore || 5) >= 5 
                        ? 'bg-brand-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${(project.projectReview.feasibilityScore || 5) * 10}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 2. Problem-Solution Alignment */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Problem-Solution Alignment</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-emerald-500 rounded-xl p-4">
              <p className="text-xs text-neutral-600 leading-relaxed">{project.projectReview.problemSolutionAlignment}</p>
            </div>
          </div>

          {/* 3. Project Risks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Project Risks</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-red-500 rounded-xl p-4">
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {project.projectReview.projectRisks?.map((risk, idx) => (
                  <li key={idx} className="text-xs text-neutral-600 leading-relaxed">{risk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Missing Skills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Missing Skills</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-neutral-400 rounded-xl p-4">
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {project.projectReview.missingSkills?.map((skill, idx) => (
                  <li key={idx} className="text-xs text-neutral-600 leading-relaxed">{skill}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. Must Build Features */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Must Build Features (High Priority)</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-brand-500 rounded-xl p-4">
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {project.projectReview.mustBuildFeatures?.map((feat, idx) => (
                  <li key={idx} className="text-xs font-semibold text-neutral-850 leading-relaxed">{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 6. Optional Features */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Optional Features (Nice to Have)</span>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {project.projectReview.optionalFeatures?.map((feat, idx) => (
                  <li key={idx} className="text-xs text-neutral-600 leading-relaxed">{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7. Features To Remove */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Features To Remove (Increases Complexity)</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-red-350 rounded-xl p-4">
              {project.projectReview.featuresToRemove && project.projectReview.featuresToRemove.length > 0 ? (
                <ul className="list-disc pl-4 flex flex-col gap-2">
                  {project.projectReview.featuresToRemove.map((feat, idx) => (
                    <li key={idx} className="text-xs text-red-650 leading-relaxed">{feat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-400 italic">No features recommended for removal.</p>
              )}
            </div>
          </div>

          {/* 8. Improvement Suggestions */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Improvement Suggestions</span>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <ul className="list-disc pl-4 flex flex-col gap-2">
                {project.projectReview.improvementSuggestions?.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-neutral-600 leading-relaxed">{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 9. Judge Perspective */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Judge Perspective</span>
            <div className="bg-brand-50/10 border border-brand-500/30 border-l-4 border-l-brand-500 rounded-xl p-4">
              <p className="text-xs text-neutral-600 leading-relaxed italic">{project.projectReview.judgePerspective}</p>
            </div>
          </div>

          {/* 10. Execution Strategy */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Execution Strategy</span>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <ol className="list-decimal pl-4 flex flex-col gap-2">
                {project.projectReview.executionStrategy?.map((step, idx) => (
                  <li key={idx} className="text-xs font-semibold text-neutral-700 leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Reasoning */}
          {project.projectReview.reasoning && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Architect Reasoning</span>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                <p className="text-xs text-neutral-600 leading-relaxed">{project.projectReview.reasoning}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={reviewLoading}
              className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs"
            >
              Regenerate Review
            </button>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* AI Task Splitter Results View */}
      {view === 'task-plan' && project && project.taskPlan && (() => {
        const plan = project.taskPlan;
        const coreCount = plan.projectTasks?.coreFeatures?.length || 0;
        const techCount = plan.projectTasks?.technicalTasks?.length || 0;
        const deployCount = plan.projectTasks?.deploymentTasks?.length || 0;
        const totalTasks = coreCount + techCount + deployCount;
        const allAssigned = (plan.assignments || []).flatMap(a => a.assignedTasks || []);
        const completedCount = allAssigned.filter(t => t.status === 'Completed').length;
        const inProgressCount = allAssigned.filter(t => t.status === 'In Progress').length;
        const completionPct = allAssigned.length > 0 ? Math.round((completedCount / allAssigned.length) * 100) : 0;
        const memberGradients = ['from-violet-500 to-purple-600','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500'];
        const memberBgColors = ['bg-violet-50 text-violet-600 border-violet-200','bg-blue-50 text-blue-600 border-blue-200','bg-emerald-50 text-emerald-600 border-emerald-200','bg-amber-50 text-amber-600 border-amber-200','bg-rose-50 text-rose-600 border-rose-200'];
        const barFills = ['bg-gradient-to-r from-violet-500 to-purple-500','bg-gradient-to-r from-blue-500 to-cyan-500','bg-gradient-to-r from-emerald-500 to-teal-500','bg-gradient-to-r from-amber-500 to-orange-500','bg-gradient-to-r from-rose-500 to-pink-500'];

        return (
          <div className="flex flex-col gap-6 animate-slide-up">
            {/* ═══ Header Banner ═══ */}
            <div className="relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-950/50 border border-purple-500/30 text-purple-400">
                      <Cpu size={10} className="animate-pulse" /> AI Agent Intelligence
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Task Splitter & Roadmap</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{project.projectName}</h2>
                  {project.taskPlanGeneratedAt && (
                    <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                      <Clock size={11} /> Plan generated {new Date(project.taskPlanGeneratedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
                  <button type="button" onClick={handleRegenerateTaskPlan} disabled={splitterLoading}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer border border-neutral-700 transition-all duration-200 disabled:opacity-50">
                    {splitterLoading ? <RefreshCw className="animate-spin text-purple-400" size={13} /> : <RefreshCw size={13} />} Regenerate Plan
                  </button>
                  <button type="button" onClick={() => setView('dashboard')}
                    className="flex items-center justify-center gap-1 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-855 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer border border-neutral-800 transition-all duration-200">
                    <ArrowLeft size={13} /> Back
                  </button>
                </div>
              </div>

              {/* Progress Summary Track */}
              <div className="relative z-10 mt-6 pt-5 border-t border-neutral-850 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aggregate Completion Scope</span>
                    <span className="text-xs font-black text-white font-mono">{completionPct}%</span>
                  </div>
                  <div className="h-2.5 bg-neutral-850 rounded-full overflow-hidden p-[2px] border border-neutral-800">
                    <div className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(124,58,237,0.45)]" style={{ width: `${completionPct}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-neutral-950/40 border border-neutral-850 rounded-xl px-4 py-2 shrink-0">
                  <Activity size={14} className="text-emerald-400 animate-pulse" />
                  <div className="text-left">
                    <div className="text-xs font-black text-white leading-none">{completedCount} <span className="text-neutral-500 font-normal">/ {allAssigned.length}</span></div>
                    <span className="text-[9px] font-bold text-neutral-550 uppercase tracking-wider mt-0.5">Tasks Completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ Navigation Tabs ═══ */}
            <div className="flex border-b border-neutral-200/80 gap-1 p-1 bg-neutral-100/60 rounded-xl overflow-x-auto scrollbar-none">
              {[
                { id: 'roadmap', label: 'Roadmap Timeline', icon: GitBranch, color: 'text-purple-600 bg-purple-50/80' },
                { id: 'team', label: 'Team Workload', icon: Users, color: 'text-blue-600 bg-blue-50/80' },
                { id: 'tasks', label: 'Task Checklist', icon: ListTodo, color: 'text-emerald-600 bg-emerald-50/80' },
                { id: 'insights', label: 'MVP Focus & Risks', icon: Target, color: 'text-amber-600 bg-amber-50/80' },
                { id: 'marketplace', label: 'Task Marketplace', icon: ShoppingBag, color: 'text-indigo-600 bg-indigo-50/80' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTaskPlanTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTaskPlanTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
                      isActive 
                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-black' 
                        : 'text-neutral-550 hover:text-neutral-800'
                    }`}
                  >
                    <Icon size={13} className={isActive ? tab.color.split(' ')[0] : 'text-neutral-450'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ═══ Tab Contents ═══ */}

            {/* Tab 1: Execution Roadmap Timeline */}
            {activeTaskPlanTab === 'roadmap' && (
              <div className="flex flex-col gap-1.5 animate-slide-up">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest">Execution Roadmap</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Sequential implementation plan generated specifically for your team structure</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100 uppercase tracking-widest font-mono">
                    {plan.executionOrder?.length || 0} Phases
                  </span>
                </div>
                
                <div className="relative mt-2 pl-2 md:pl-4">
                  <div className="flex flex-col">
                    {plan.executionOrder?.map((step, idx) => {
                      const meta = getStepMeta(step);
                      const StepIcon = meta.icon;
                      const isFirst = idx === 0;
                      const isLast = idx === plan.executionOrder.length - 1;
                      const cleanText = step.replace(/^\d+\.\s*/, '');
                      return (
                        <div key={idx} className="flex gap-4 relative group items-stretch">
                          {/* Timeline vertical bar & counter */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 z-10 ${
                              isFirst 
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-transparent text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]' 
                                : 'bg-white border-neutral-200 text-neutral-505 group-hover:border-purple-300 group-hover:text-purple-600'
                            }`}>
                              {idx + 1}
                            </div>
                            {!isLast && (
                              <div className="w-[2px] grow bg-neutral-200 my-1.5 group-hover:bg-purple-250 transition-colors"></div>
                            )}
                          </div>
                          {/* Card details */}
                          <div className="flex-1 pb-6">
                            <div className="bg-white border border-neutral-200/80 hover:border-purple-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-purple-500 transition-all duration-300"></div>
                              
                              <div className="flex items-start gap-3.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 border ${
                                  isFirst ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-neutral-50 border-neutral-100 text-neutral-450'
                                }`}>
                                  <StepIcon size={15} />
                                </div>
                                <div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border mb-1.5 ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  <h4 className="text-xs font-semibold text-neutral-750 leading-relaxed group-hover:text-neutral-900 transition-colors">
                                    {cleanText}
                                  </h4>
                                </div>
                              </div>
                              
                              <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50 px-2 py-1 rounded-md border border-neutral-150 font-mono">
                                  Step {idx + 1}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Team Assignments & Workloads */}
            {activeTaskPlanTab === 'team' && (() => {
              const percentages = plan.workloadDistribution?.map(d => d.percentage || 0) || [];
              const maxPct = Math.max(...percentages, 0);
              const minPct = Math.min(...percentages, 0);
              const diffPct = maxPct - minPct;
              
              const strokeHexColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];

              return (
                <div className="flex flex-col gap-6 animate-slide-up">
                  {/* Workload Distribution Analytics */}
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest flex items-center gap-1.5">
                        <BarChart3 size={13} className="text-neutral-505" /> Workload Allocation Analysis
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Complexity allocation derived from task counts, deliverables scope, and skills compatibility</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Left: Interactive Donut Chart */}
                      <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-6 p-5 bg-neutral-50/45 border border-neutral-150 rounded-2xl">
                        
                        {/* Circle Donut Wrapper */}
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 origin-center">
                            {/* Base Track */}
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f1f5f9"
                              strokeWidth="8.5"
                            />
                            {/* Segment Circles */}
                            {(() => {
                              let accumulatedOffset = 0;
                              return plan.workloadDistribution?.map((dist, idx) => {
                                const segmentLength = ((dist.percentage || 0) / 100) * 238.76;
                                const strokeDashoffset = -accumulatedOffset;
                                accumulatedOffset += segmentLength;
                                const strokeColor = strokeHexColors[idx % strokeHexColors.length];
                                const isHovered = hoveredMember && hoveredMember.member === dist.member;

                                return (
                                  <circle
                                    key={idx}
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke={strokeColor}
                                    strokeWidth={isHovered ? 11.5 : 8.5}
                                    strokeDasharray={`${segmentLength} 238.76`}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-250 cursor-pointer origin-center"
                                    onMouseEnter={() => setHoveredMember(dist)}
                                    onMouseLeave={() => setHoveredMember(null)}
                                  />
                                );
                              });
                            })()}
                          </svg>

                          {/* Center Text Panel */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                            {hoveredMember ? (
                              <>
                                <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider truncate max-w-[85px] leading-none">
                                  {hoveredMember.member}
                                </span>
                                <span className="text-sm font-black text-neutral-905 font-mono mt-1">
                                  {hoveredMember.percentage}%
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                                  Balance
                                </span>
                                <span className={`text-[10px] font-extrabold mt-1.5 px-2 py-0.5 rounded-md border text-center leading-none ${
                                  diffPct > 30 ? 'bg-red-50 text-red-700 border-red-100' :
                                  diffPct > 15 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                  {diffPct > 30 ? 'Skewed' : diffPct > 15 ? 'Moderate' : 'Optimal'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Donut stats panel */}
                        <div className="flex flex-col gap-2.5 w-full sm:flex-1 lg:w-full">
                          <div className="flex justify-between items-center text-xs border-b border-neutral-200/50 pb-2">
                            <span className="text-neutral-500 font-medium">Workload Delta</span>
                            <span className="font-bold text-neutral-800 font-mono">{diffPct}% max diff</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-neutral-200/50 pb-2">
                            <span className="text-neutral-500 font-medium">Team Members</span>
                            <span className="font-bold text-neutral-800 font-mono">{plan.assignments?.length || 0} dev(s)</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-medium">Average Load</span>
                            <span className="font-bold text-neutral-800 font-mono">
                              {Math.round(100 / (plan.assignments?.length || 1))}% / dev
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right: Detailed List and Bars */}
                      <div className="lg:col-span-7 flex flex-col gap-3">
                        {plan.workloadDistribution?.map((dist, idx) => {
                          const colorIdx = idx % barFills.length;
                          const isHovered = hoveredMember && hoveredMember.member === dist.member;
                          const hexColor = strokeHexColors[colorIdx];
                          const memberTasks = plan.assignments?.find(a => a.member === dist.member)?.assignedTasks || [];
                          
                          return (
                            <div 
                              key={idx} 
                              onMouseEnter={() => setHoveredMember(dist)}
                              onMouseLeave={() => setHoveredMember(null)}
                              className={`border rounded-xl p-3.5 flex flex-col gap-2.5 transition-all duration-200 ${
                                isHovered 
                                  ? 'bg-neutral-50 border-purple-305 shadow-3xs' 
                                  : 'bg-neutral-50/20 border-neutral-150 hover:border-neutral-250 hover:bg-neutral-50/50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${memberGradients[colorIdx]} flex items-center justify-center text-white font-extrabold text-[10px] shrink-0 shadow-3xs`}>
                                    {dist.member.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-neutral-850 block">{dist.member}</span>
                                    <span className="text-[10px] text-neutral-450 block font-semibold">{memberTasks.length} tasks assigned</span>
                                  </div>
                                </div>
                                <span className="text-sm font-black text-neutral-900 font-mono" style={{ color: isHovered ? hexColor : undefined }}>
                                  {dist.percentage}%
                                </span>
                              </div>
                              <div className="h-2 bg-neutral-200/85 rounded-full overflow-hidden p-[1px]">
                                <div className={`h-full rounded-full ${barFills[colorIdx]} transition-all duration-1000 ease-out`} style={{ width: `${dist.percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Team Member Task Boards */}
                  <div className="flex flex-col gap-1.5">
                    <div className="mb-2">
                      <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest">Team Boards</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">Track individual milestones and click checkmarks to quickly toggle completion</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {plan.assignments?.map((assign, idx) => {
                        const memberTasks = assign.assignedTasks || [];
                        const memberCompleted = memberTasks.filter(t => t.status === 'Completed').length;
                        const memberProgress = memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0;
                        const colorIdx = idx % memberGradients.length;
                        return (
                          <div key={idx} className="bg-white border border-neutral-205 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-200 transition-all duration-300 flex flex-col group">
                            {/* Card Header with user identity */}
                            <div className="p-4 bg-neutral-50/50 border-b border-neutral-100">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${memberGradients[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs`}>
                                  {assign.member.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-neutral-905 truncate group-hover:text-purple-650 transition-colors">
                                    {assign.member}
                                  </h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {assign.skills.map((s, sIdx) => (
                                      <span key={sIdx} className={`px-2 py-0.5 text-[8px] font-bold rounded-md border tracking-wider uppercase ${memberBgColors[colorIdx]}`}>
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-base font-extrabold text-neutral-900 font-mono leading-none">
                                    {memberCompleted}<span className="text-xs text-neutral-450 font-normal">/{memberTasks.length}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-neutral-455 uppercase tracking-widest mt-1 inline-block">Done</span>
                                </div>
                              </div>
                              
                              <div className="mt-3.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ease-out ${barFills[colorIdx]}`} style={{ width: `${memberProgress}%` }}></div>
                                </div>
                                <span className="text-[9px] font-bold text-neutral-500 font-mono">{memberProgress}%</span>
                              </div>
                            </div>

                            {/* Checklist Section */}
                            <div className="p-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto grow">
                              {memberTasks.map((t, tIdx) => {
                                const sc = { 
                                  'Not Started': { dot: 'bg-neutral-350', bg: 'bg-neutral-50/50 border-neutral-100 hover:border-neutral-205', tx: 'text-neutral-500 border-neutral-200 bg-white' }, 
                                  'In Progress': { dot: 'bg-amber-400 animate-pulse', bg: 'bg-amber-50/20 border-amber-100/70 hover:border-amber-200/50', tx: 'text-amber-700 border-amber-200 bg-amber-50/30' }, 
                                  'Completed': { dot: 'bg-emerald-500', bg: 'bg-emerald-50/15 border-emerald-100 hover:border-emerald-200/40', tx: 'text-emerald-700 border-emerald-200 bg-emerald-50/30' } 
                                };
                                const cfg = sc[t.status] || sc['Not Started'];
                                const isCompleted = t.status === 'Completed';
                                
                                return (
                                  <div key={tIdx} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 ${cfg.bg}`}>
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateTaskStatus(assign.member, t.task, isCompleted ? 'Not Started' : 'Completed')}
                                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs' 
                                          : 'bg-white border-neutral-250 text-transparent hover:border-emerald-400 hover:text-emerald-500/20'
                                      }`}
                                    >
                                      <CheckCircle size={10} className={isCompleted ? 'stroke-[3.5]' : ''} />
                                    </button>
                                    
                                    <span className={`text-xs font-semibold flex-1 leading-relaxed ${isCompleted ? 'text-neutral-400 line-through font-normal' : 'text-neutral-705'}`}>
                                      {t.task}
                                    </span>
                                    
                                    <select 
                                      value={t.status} 
                                      onChange={(e) => handleUpdateTaskStatus(assign.member, t.task, e.target.value)}
                                      className={`text-[9px] font-bold rounded-lg px-2 py-1 bg-white border cursor-pointer hover:border-neutral-305 focus:outline-none transition-colors ${cfg.tx}`}
                                    >
                                      <option value="Not Started">⏳ Not Started</option>
                                      <option value="In Progress">🔄 In Progress</option>
                                      <option value="Completed">✅ Completed</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>

                            {/* AI Placement explanation */}
                            {assign.reason && (
                              <div className="px-4 pb-4 mt-auto border-t border-neutral-50 pt-3 bg-neutral-50/30">
                                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 flex gap-2">
                                  <Cpu size={12} className="text-purple-400 mt-0.5 shrink-0" />
                                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                                    <span className="font-bold text-neutral-600">AI Assignment logic: </span>
                                    {assign.reason}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tab 3: Detailed Task Checklist */}
            {activeTaskPlanTab === 'tasks' && (
              <div className="flex flex-col gap-1.5 animate-slide-up">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest">Milestones Overview</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Complete list of scope elements split by task types</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Core Features */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={13} className="text-purple-500" /> Core Features
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[10px] font-extrabold">{coreCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.coreFeatures?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-purple-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 shrink-0 group-hover:bg-purple-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>

                  {/* Technical Tasks */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={13} className="text-blue-500" /> Technical Tasks
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-extrabold">{techCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.technicalTasks?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-blue-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0 group-hover:bg-blue-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>

                  {/* Deployment Tasks */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap size={13} className="text-emerald-500 animate-pulse" /> Deployment Tasks
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold">{deployCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.deploymentTasks?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-emerald-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0 group-hover:bg-emerald-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Insights & MVP Focus */}
            {activeTaskPlanTab === 'insights' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up">
                {/* Critical Tasks */}
                <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Zap size={16} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Critical for Demo</h3>
                        <p className="text-[10px] text-amber-600/70 mt-0.5">MVP Core Deliverables</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.criticalTasks?.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-amber-50/30 border border-amber-100 rounded-xl">
                          <AlertTriangle size={12} className="text-amber-505 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-amber-850 leading-relaxed">{task}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>

                {/* Recommended Focus */}
                <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
                        <Target size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-purple-805 uppercase tracking-widest">Judging Impact</h3>
                        <p className="text-[10px] text-purple-600/70 mt-0.5">Focus areas to stand out</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.recommendedFocus?.map((focus, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-purple-50/30 border border-purple-100 rounded-xl">
                          <Star size={12} className="text-purple-500 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-purple-855 leading-relaxed">{focus}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>

                {/* Risk Alerts */}
                <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-red-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 to-rose-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-red-805 uppercase tracking-widest">Risk Alerts</h3>
                        <p className="text-[10px] text-red-650/70 mt-0.5">Keep an eye on these pitfalls</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.warnings?.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-red-50/30 border border-red-100 rounded-xl">
                          <AlertTriangle size={12} className="text-red-505 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-red-855 leading-relaxed">{warning}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Task Marketplace */}
            {activeTaskPlanTab === 'marketplace' && (
              <TaskMarketplace 
                projectId={project._id}
                teamId={teamId}
                onRefreshProject={async () => {
                  try {
                    const res = await getProjectByTeam(teamId);
                    if (res.success && res.project) {
                      setProject(res.project);
                    }
                  } catch (err) {
                    console.error('Error refreshing project details:', err);
                  }
                }}
              />
            )}
          </div>
        );
      })()}

      {/* AI Mentor Chat View */}
      {view === 'mentor-chat' && project && (
        <div className="flex flex-col overflow-hidden bg-white border border-neutral-200 rounded-xl h-[550px] shadow-xs w-full">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Cpu size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900 leading-tight">AI Mentor</h2>
                <p className="text-[10px] text-neutral-400 leading-none mt-0.5">
                  Ask questions about your project scope, risks, pitch, and execution.
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {/* Messages Window */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-neutral-50/50 min-h-0"
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                <RefreshCw className="animate-spin text-brand-500 mb-2" size={20} />
                <span className="text-xs font-semibold">Loading conversation history...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-4">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <Cpu size={24} />
                </div>
                <h4 className="font-bold text-neutral-900 text-sm">Ask the AI Mentor anything</h4>
                <p className="text-xs text-neutral-500 max-w-[340px] leading-relaxed mt-1 mb-3 mx-auto">
                  The AI mentor is fully context-aware of your problem statement, deliverables, team profile, and review report.
                </p>
                <div className="text-[10px] text-neutral-400 font-medium italic">
                  Try clicking one of the suggested questions below to start.
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg._id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-3xs ${
                    msg.role === 'user' 
                      ? 'bg-neutral-900 text-white rounded-tr-xs' 
                      : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-tl-xs'
                  }`}>
                    {msg.role === 'user' ? msg.message : renderMarkdown(msg.message)}
                    <div className={`text-[9px] mt-1.5 text-right ${msg.role === 'user' ? 'text-white/60' : 'text-neutral-400'}`}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Thinking / Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border border-neutral-200 text-neutral-800 p-3 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2">
                  <RefreshCw className="animate-spin text-brand-500" size={12} />
                  <span className="font-semibold text-neutral-500">AI Mentor is drafting response...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {chatError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs text-center">
                {chatError}
              </div>
            )}
          </div>

          {/* Quick Action Suggested Chips */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white shrink-0 scrollbar-none">
            {[
              'Why is my score low?',
              'How can we improve?',
              'What will judges like?',
              'Which feature should we prioritize?',
              'What should we remove?',
              'Can we finish on time?',
              'What should our demo flow be?',
              'What questions might judges ask?'
            ].map((suggested, idx) => (
              <button
                key={idx}
                type="button"
                disabled={chatLoading}
                onClick={() => handleSendChatMessage(suggested)}
                className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-full cursor-pointer transition-all shadow-3xs whitespace-nowrap"
              >
                {suggested}
              </button>
            ))}
          </div>

          {/* Text input area */}
          <div className="p-3 bg-white border-t border-neutral-200 flex gap-2 items-center sticky bottom-0 z-10 shrink-0">
            <textarea
              rows={1}
              disabled={chatLoading}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="Ask about your project..."
              className="flex-1 form-input"
              style={{ resize: 'none', maxHeight: '42px' }}
            />
            <button
              type="button"
              disabled={chatLoading || !chatInput.trim()}
              onClick={() => handleSendChatMessage()}
              className="btn-primary text-xs py-2 px-4 shadow-xs shrink-0 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Prompt Create View */}
      {view === 'create-prompt' && (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full">
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs">
            <FolderGit2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">No Active Project</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Your team hasn't registered a project. Define your hackathon idea, select tracks, and manage development deliverables.
            </p>
          </div>
          <button 
            className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer" 
            onClick={enterCreateMode}
          >
            <Plus size={15} /> Define Team Project
          </button>
        </div>
      )}

      {/* Create / Edit Form View */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={view === 'create' ? handleCreateProject : handleUpdateProject} className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-2 mb-2">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              {view === 'create' ? 'Define Hackathon Project' : 'Edit Project Details'}
            </span>
            <button 
              type="button" 
              onClick={() => setView(project ? 'dashboard' : 'create-prompt')}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {/* Project Name */}
          <div className="form-group">
            <label className="input-label">Project Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. HackBuddy Copilot" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          {/* Track and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="input-label">Track (e.g. AI/ML, Web3)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. AI/ML" 
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Hackathon Duration (e.g. 24h, 3 days)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 36 hours" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {/* Problem Statement */}
          <div className="form-group">
            <label className="input-label">Problem Statement *</label>
            <textarea 
              rows={3}
              className="form-input resize-none" 
              placeholder="Describe the problem your project is solving."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              required
            />
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Minimum 20 characters
            </span>
          </div>

          {/* Project Description */}
          <div className="form-group">
            <label className="input-label">Project Description</label>
            <textarea 
              rows={3}
              className="form-input resize-none" 
              placeholder="Provide a detailed description of your hackathon project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status (Edit only) */}
          {view === 'edit' && (
            <div className="form-group">
              <label className="input-label">Project Status</label>
              <select
                className="form-input cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}

          {/* Dynamic Features Manager */}
          <div className="form-group">
            <label className="input-label">Configure Deliverables / Features</label>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 mt-1">
              {/* Added Features Row */}
              <div className="flex flex-wrap gap-2">
                {features.length > 0 ? (
                  features.map((feature, index) => (
                    <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold rounded-lg hover:border-brand-200 transition-all">
                      <span className="max-w-[200px] truncate">{feature}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFeature(index)} 
                        className="p-0.5 text-brand-500 hover:text-red-650 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-neutral-400 italic font-semibold">No features defined yet. Add features below.</span>
                )}
              </div>

              {/* Input Feature Row */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="form-input flex-1" 
                  placeholder="e.g. Build backend API auth gateway"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature(e);
                    }
                  }}
                />
                <button 
                  type="button" 
                  onClick={handleAddFeature}
                  className="btn-secondary text-xs px-3 cursor-pointer"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
            disabled={actionLoading}
          >
            <Save size={15} /> {view === 'create' ? 'Create Project Profile' : 'Save Modifications'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ProjectHub;
