import React, { useState, useEffect, useRef } from 'react';
import { 
  createProject, 
  getProjectByTeam, 
  updateProject, 
  deleteProject,
  analyzeProject,
  getChatHistory,
  sendChatMessage
} from '../services/projectService';
import { toast } from 'react-hot-toast';
import { 
  FolderGit2, Plus, Trash2, Edit3, ListTodo, 
  Play, CheckCircle, Clock, ArrowLeft, Save, AlertTriangle, RefreshCw, Cpu
} from 'lucide-react';

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

const ProjectHub = ({ teamId }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'edit'
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
