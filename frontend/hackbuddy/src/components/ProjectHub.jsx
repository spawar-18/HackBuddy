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
    <div className="details-card project-hub-card">
      <style>{`
        /* Tailwind CSS polyfills — scoped to ProjectHub only */
        .project-hub-card .flex { display: flex; }
        .project-hub-card .flex-col { flex-direction: column; }
        .project-hub-card .flex-1 { flex: 1 1 0%; min-height: 0; }
        .project-hub-card .flex-wrap { flex-wrap: wrap; }
        .project-hub-card .items-center { align-items: center; }
        .project-hub-card .justify-between { justify-content: space-between; }
        .project-hub-card .justify-start { justify-content: flex-start; }
        .project-hub-card .justify-end { justify-content: flex-end; }
        .project-hub-card .justify-center { justify-content: center; }
        .project-hub-card .gap-1 { gap: 0.25rem; }
        .project-hub-card .gap-1\.5 { gap: 0.375rem; }
        .project-hub-card .gap-2 { gap: 0.5rem; }
        .project-hub-card .gap-3 { gap: 0.75rem; }
        .project-hub-card .gap-4 { gap: 1rem; }
        .project-hub-card .gap-6 { gap: 1.5rem; }
        .project-hub-card .gap-8 { gap: 2rem; }
        .project-hub-card .overflow-hidden { overflow: hidden; }
        .project-hub-card .overflow-y-auto { overflow-y: auto; }
        .project-hub-card .overflow-x-auto { overflow-x: auto; }
        .project-hub-card .grid { display: grid; }
        .project-hub-card .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .project-hub-card .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .project-hub-card .mb-1 { margin-bottom: 0.25rem; }
        .project-hub-card .mb-2 { margin-bottom: 0.5rem; }
        .project-hub-card .mt-2 { margin-top: 0.5rem; }
        .project-hub-card .mt-4 { margin-top: 1rem; }
        .project-hub-card .pt-4 { padding-top: 1rem; }
        .project-hub-card .pb-2 { padding-bottom: 0.5rem; }
        .project-hub-card .w-auto { width: auto; }
        .project-hub-card .h-full { height: 100%; }
        .project-hub-card .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .project-hub-card .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .project-hub-card .p-4 { padding: 1rem; }
        .project-hub-card .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .project-hub-card .p-3 { padding: 0.75rem; }
        .project-hub-card .px-2\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
        .project-hub-card .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .project-hub-card .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .project-hub-card .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .project-hub-card .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .project-hub-card .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .project-hub-card .border-b { border-bottom: 1px solid var(--border); }
        .project-hub-card .border-t { border-top: 1px solid var(--border); }
        .project-hub-card .border-slate-200 { border-color: var(--border); }
        .project-hub-card .border-slate-300 { border-color: #cbd5e1; }
        .project-hub-card .border { border: 1px solid var(--border); }
        
        /* Font and text */
        .project-hub-card .text-xs { font-size: 0.75rem; }
        .project-hub-card .text-sm { font-size: 0.875rem; }
        .project-hub-card .font-bold { font-weight: 700; }
        .project-hub-card .font-semibold { font-weight: 600; }
        .project-hub-card .italic { font-style: italic; }
        .project-hub-card .text-center { text-align: center; }
        .project-hub-card .rounded-full { border-radius: 9999px; }
        .project-hub-card .rounded { border-radius: 0.25rem; }
        
        /* Colors */
        .project-hub-card .text-slate-400 { color: var(--text-muted); }
        .project-hub-card .text-slate-500 { color: var(--text-muted); }
        .project-hub-card .text-slate-700 { color: var(--text-secondary); }
        .project-hub-card .text-primary { color: var(--primary); }
        
        /* Status badges */
        .project-hub-card .bg-amber-50 { background-color: rgba(245, 158, 11, 0.05); }
        .project-hub-card .border-amber-200 { border-color: rgba(245, 158, 11, 0.2); }
        .project-hub-card .text-amber-700 { color: #b45309; }
        .project-hub-card .bg-blue-50 { background-color: rgba(0, 74, 198, 0.05); }
        .project-hub-card .border-blue-200 { border-color: rgba(0, 74, 198, 0.2); }
        .project-hub-card .text-blue-700 { color: var(--primary); }
        .project-hub-card .bg-emerald-50 { background-color: rgba(0, 108, 73, 0.05); }
        .project-hub-card .border-emerald-200 { border-color: rgba(0, 108, 73, 0.2); }
        .project-hub-card .text-emerald-700 { color: var(--success); }
        .project-hub-card .bg-slate-200 { background-color: var(--bg-deep); }
        .project-hub-card .hover\:bg-slate-300:hover { background-color: var(--border); }
        .project-hub-card .hover\:bg-slate-100:hover { background-color: rgba(0, 74, 198, 0.05); }
        .project-hub-card .hover\:border-slate-400:hover { border-color: var(--primary); }
        .project-hub-card .hover\:text-slate-700:hover { color: var(--text-secondary); }
        
        .project-hub-card .animate-spin {
          animation: spin 1s linear infinite;
        }

        .project-hub-card {
          position: relative;
          overflow: visible;
          transition: all 0.3s ease;
        }

        .hub-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }

        .hub-title-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .project-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .project-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .project-section-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          display: block;
        }

        .info-block {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1rem;
        }

        .info-value {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-default);
          padding: 0.5rem 0.75rem;
        }

        .btn-edit {
          background: var(--primary-glow);
          color: var(--primary);
          border: 1px solid var(--primary);
          border-radius: var(--radius-default);
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-edit:hover {
          background: var(--primary);
          color: #ffffff;
        }

        .btn-delete {
          background: var(--danger-glow);
          color: var(--danger);
          border: 1px solid var(--danger);
          border-radius: var(--radius-default);
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
        }

        .btn-delete:hover {
          background: var(--danger);
          color: #ffffff;
        }

        .btn-action-primary {
          background: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-default);
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: fit-content;
        }

        .btn-action-primary:hover:not(:disabled) {
          background: var(--primary-hover);
          box-shadow: 0 0 15px var(--primary-glow);
        }

        .form-group-project {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 1rem;
        }

        .form-label-project {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .form-input-project {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius-default);
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
        }

        .form-input-project:focus {
          border-color: var(--border-focus);
        }

        .dynamic-features-box {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1rem;
          background: var(--bg-deep);
        }

        .feature-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .delete-btn-feature {
          background: none;
          border: none;
          color: var(--danger);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .delete-btn-feature:hover {
          opacity: 0.8;
        }

        .prompt-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1rem;
          gap: 1rem;
        }

        .prompt-icon-container {
          background: var(--primary-glow);
          color: var(--primary);
          padding: 1rem;
          border-radius: 50%;
        }
      `}</style>

      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-container">
          <div className="icon-box" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <FolderGit2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Project Hub</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Manage project details, tracks, and features</p>
          </div>
        </div>
        {view === 'dashboard' && project && getStatusBadge(project.status)}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && project && (
        <div className="project-grid">
          <div>
            <h1 className="project-title mb-1">{project.projectName}</h1>
            <div className="flex gap-4 text-xs font-semibold text-slate-500">
              {project.track && <span>Track: <b className="text-primary">{project.track}</b></span>}
              {project.duration && <span>Duration: <b className="text-primary">{project.duration}</b></span>}
            </div>
          </div>

          {/* Problem Statement */}
          <div>
            <span className="project-section-title">Problem Statement</span>
            <div className="info-block" style={{ borderLeft: '4px solid var(--danger)' }}>
              <p className="info-value" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {project.problemStatement}
              </p>
            </div>
          </div>

          {project.description && (
            <div>
              <span className="project-section-title">Description</span>
              <div className="info-block">
                <p className="info-value">{project.description}</p>
              </div>
            </div>
          )}

          <div>
            <span className="project-section-title">Features Checklist</span>
            <div className="features-list">
              {project.featuresToBuild && project.featuresToBuild.length > 0 ? (
                project.featuresToBuild.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <ListTodo size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>{feature}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No features configured yet. Click Edit Project to add features.
                </p>
              )}
            </div>
          </div>

          {/* AI Project Review Card */}
          <div className="glass" style={{
            background: 'var(--bg-deep)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginTop: '0.5rem',
            borderLeft: '4px solid var(--primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <Cpu size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                AI Project Review
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Analyze the project's feasibility, risks, scope, missing skills, and improvement opportunities.
            </p>
            
            {reviewLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <RefreshCw className="spin animate-spin" size={14} style={{ color: 'var(--primary)' }} />
                <span>Analyzing Project...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!project.projectReview ? (
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    className="btn-action-primary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-default)', width: 'auto' }}
                  >
                    Analyze Project
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('review-report')}
                      className="btn-action-primary"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-default)', width: 'auto' }}
                    >
                      View Review
                    </button>
                    <button
                      type="button"
                      onClick={openMentorChat}
                      className="btn-action-primary"
                      style={{ 
                        padding: '0.4rem 1rem', 
                        fontSize: '0.85rem', 
                        borderRadius: 'var(--radius-default)', 
                        width: 'auto',
                        background: 'var(--tertiary)' 
                      }}
                    >
                      Open AI Mentor
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      className="btn-edit"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-default)', height: 'auto' }}
                    >
                      Regenerate Review
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-slate-200 pt-4 mt-2">
            <button 
              onClick={enterEditMode}
              className="btn-edit"
              disabled={actionLoading}
            >
              <Edit3 size={14} /> Edit Project
            </button>
            <button 
              onClick={handleDeleteProject}
              className="btn-delete"
              disabled={actionLoading}
            >
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>
      )}

      {/* AI Project Review Report View */}
      {view === 'review-report' && project && project.projectReview && (
        <div className="project-grid">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                AI Project Review Report
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </button>
          </div>

          {/* Report generated timestamp */}
          {project.projectReviewGeneratedAt && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '-0.5rem' }}>
              Generated on: {new Date(project.projectReviewGeneratedAt).toLocaleString()}
            </div>
          )}

          {/* 1. Feasibility Score */}
          <div>
            <span className="project-section-title">Feasibility Score</span>
            <div style={{ 
              background: 'var(--bg-deep)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {project.projectReview.feasibilityScore?.toFixed(1) || 'N/A'}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}> / 10</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
                  PROTOTYPE BUILD READINESS
                </div>
              </div>
              
              {/* Micro-meter visual */}
              <div style={{ 
                width: '120px', 
                height: '8px', 
                background: 'var(--border)', 
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${(project.projectReview.feasibilityScore || 5) * 10}%`, 
                  height: '100%', 
                  background: (project.projectReview.feasibilityScore || 5) >= 8 ? 'var(--success)' : ((project.projectReview.feasibilityScore || 5) >= 5 ? 'var(--primary)' : 'var(--danger)')
                }}></div>
              </div>
            </div>
          </div>

          {/* 2. Problem-Solution Alignment */}
          <div>
            <span className="project-section-title">Problem-Solution Alignment</span>
            <div className="info-block" style={{ borderLeft: '4px solid var(--success)' }}>
              <p className="info-value">{project.projectReview.problemSolutionAlignment}</p>
            </div>
          </div>

          {/* 3. Project Risks */}
          <div>
            <span className="project-section-title">Project Risks</span>
            <div className="info-block" style={{ borderLeft: '4px solid var(--danger)' }}>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.projectRisks?.map((risk, idx) => (
                  <li key={idx} className="info-value">{risk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Missing Skills */}
          <div>
            <span className="project-section-title">Missing Skills</span>
            <div className="info-block" style={{ borderLeft: '4px solid var(--text-muted)' }}>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.missingSkills?.map((skill, idx) => (
                  <li key={idx} className="info-value">{skill}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. Must Build Features */}
          <div>
            <span className="project-section-title">Must Build Features (High Priority)</span>
            <div className="info-block" style={{ borderLeft: '4px solid var(--primary)' }}>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.mustBuildFeatures?.map((feat, idx) => (
                  <li key={idx} className="info-value" style={{ fontWeight: 600 }}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 6. Optional Features */}
          <div>
            <span className="project-section-title">Optional Features (Nice to Have)</span>
            <div className="info-block">
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.optionalFeatures?.map((feat, idx) => (
                  <li key={idx} className="info-value">{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7. Features To Remove */}
          <div>
            <span className="project-section-title">Features To Remove (Increases Complexity)</span>
            <div className="info-block" style={{ borderLeft: '4px solid rgba(220, 38, 38, 0.3)' }}>
              {project.projectReview.featuresToRemove && project.projectReview.featuresToRemove.length > 0 ? (
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {project.projectReview.featuresToRemove.map((feat, idx) => (
                    <li key={idx} className="info-value" style={{ color: 'var(--danger)' }}>{feat}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  No features recommended for removal.
                </p>
              )}
            </div>
          </div>

          {/* 8. Improvement Suggestions */}
          <div>
            <span className="project-section-title">Improvement Suggestions</span>
            <div className="info-block">
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.improvementSuggestions?.map((suggestion, idx) => (
                  <li key={idx} className="info-value">{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 9. Judge Perspective */}
          <div>
            <span className="project-section-title">Judge Perspective</span>
            <div className="info-block" style={{ background: 'rgba(0, 74, 198, 0.02)', border: '1px solid var(--primary)' }}>
              <p className="info-value" style={{ fontStyle: 'italic' }}>{project.projectReview.judgePerspective}</p>
            </div>
          </div>

          {/* 10. Execution Strategy */}
          <div>
            <span className="project-section-title">Execution Strategy</span>
            <div className="info-block">
              <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.projectReview.executionStrategy?.map((step, idx) => (
                  <li key={idx} className="info-value" style={{ fontWeight: 500 }}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Reasoning */}
          {project.projectReview.reasoning && (
            <div>
              <span className="project-section-title">Architect Reasoning</span>
              <div className="info-block">
                <p className="info-value">{project.projectReview.reasoning}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={reviewLoading}
              className="btn-action-primary"
              style={{ fontSize: '0.85rem', borderRadius: 'var(--radius-default)', padding: '0.5rem 1rem', width: 'auto' }}
            >
              Regenerate Review
            </button>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="btn-edit"
              style={{ fontSize: '0.85rem', borderRadius: 'var(--radius-default)', padding: '0.5rem 1rem', height: 'auto' }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* AI Mentor Chat View */}
      {view === 'mentor-chat' && project && (
        <div className="flex flex-col overflow-hidden" style={{
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-primary)',
          height: '550px'
        }}>
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                background: 'var(--primary-glow)', 
                color: 'var(--primary)',
                padding: '6px',
                borderRadius: '50%'
              }}>
                <Cpu size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>AI Mentor</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Ask questions about your project, scope, risks, judging, and execution.
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </button>
          </div>

          {/* Messages Window */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" 
            style={{ background: 'var(--bg-deep)', minHeight: 0 }}
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <RefreshCw className="spin animate-spin mb-2" size={24} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-semibold">Loading conversation history...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-4">
                <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '50%', marginBottom: '12px' }}>
                  <Cpu size={28} />
                </div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Ask the AI Mentor anything</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: '1.4', margin: '0 auto 12px auto' }}>
                  The AI already understands your Problem Statement, Features, Team Skills, and Project Review, and can provide project-specific guidance.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Try clicking one of the suggested questions below to start.
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg._id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '10px 14px', 
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    background: msg.role === 'user' ? 'var(--primary)' : 'rgba(0, 74, 198, 0.03)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    boxShadow: msg.role === 'user' ? 'none' : '0 2px 5px rgba(0,0,0,0.02)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.role === 'user' ? msg.message : renderMarkdown(msg.message)}
                    <div style={{ 
                      fontSize: '0.7rem', 
                      marginTop: '4px', 
                      textAlign: 'right', 
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' 
                    }}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Thinking / Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start">
                <div style={{ 
                  background: 'var(--bg-card-solid)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <RefreshCw className="spin animate-spin" size={12} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 600 }}>AI Mentor is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {chatError && (
              <div style={{ 
                background: 'var(--danger-glow)', 
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-default)',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {chatError}
              </div>
            )}
          </div>

          {/* Quick Action Suggested Chips */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t" style={{ 
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card-solid)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
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
                style={{ 
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="hover:bg-slate-100 hover:border-slate-400"
              >
                {suggested}
              </button>
            ))}
          </div>

          {/* Text input area */}
          <div className="p-3 border-t flex gap-2 items-center" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card-solid)' }}>
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
              className="flex-1 form-input-project"
              style={{ 
                resize: 'none', 
                borderRadius: 'var(--radius-default)',
                padding: '8px 12px',
                fontSize: '0.9rem',
                maxHeight: '60px'
              }}
            />
            <button
              type="button"
              disabled={chatLoading || !chatInput.trim()}
              onClick={() => handleSendChatMessage()}
              className="btn-action-primary"
              style={{ 
                width: 'auto', 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem', 
                borderRadius: 'var(--radius-default)',
                flexShrink: 0
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Prompt Create View */}
      {view === 'create-prompt' && (
        <div className="prompt-container">
          <div className="prompt-icon-container">
            <FolderGit2 size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Project</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '320px', margin: '0 auto' }}>
              Your team hasn't registered a project. Define your hackathon idea, select tracks, and manage development deliverables.
            </p>
          </div>
          <button 
            className="btn-action-primary" 
            onClick={enterCreateMode}
          >
            <Plus size={16} /> Define Team Project
          </button>
        </div>
      )}

      {/* Create / Edit Form View */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={view === 'create' ? handleCreateProject : handleUpdateProject} className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {view === 'create' ? 'Define Hackathon Project' : 'Edit Project Details'}
            </span>
            <button 
              type="button" 
              onClick={() => setView(project ? 'dashboard' : 'create-prompt')}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs font-semibold"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {/* Project Name */}
          <div className="form-group-project">
            <label className="form-label-project">Project Name *</label>
            <input 
              type="text" 
              className="form-input-project" 
              placeholder="e.g. HackBuddy Copilot" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          {/* Track and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div className="form-group-project">
              <label className="form-label-project">Track (e.g. AI/ML, Web3)</label>
              <input 
                type="text" 
                className="form-input-project" 
                placeholder="e.g. AI/ML" 
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              />
            </div>

            <div className="form-group-project">
              <label className="form-label-project">Hackathon Duration (e.g. 24h, 3 days)</label>
              <input 
                type="text" 
                className="form-input-project" 
                placeholder="e.g. 36 hours" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {/* Problem Statement */}
          <div className="form-group-project">
            <label className="form-label-project">Problem Statement *</label>
            <textarea 
              rows={3}
              className="form-input-project" 
              placeholder="Describe the problem your project is solving."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Minimum 20 characters
            </span>
          </div>

          {/* Project Description */}
          <div className="form-group-project">
            <label className="form-label-project">Project Description</label>
            <textarea 
              rows={3}
              className="form-input-project" 
              placeholder="Provide a detailed description of your hackathon project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status (Edit only) */}
          {view === 'edit' && (
            <div className="form-group-project">
              <label className="form-label-project">Project Status</label>
              <select
                className="form-input-project"
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
          <div className="form-group-project">
            <label className="form-label-project">Configure Deliverables / Features</label>
            <div className="dynamic-features-box flex flex-col gap-3">
              {/* Added Features Row */}
              <div className="flex flex-wrap gap-2">
                {features.length > 0 ? (
                  features.map((feature, index) => (
                    <div key={index} className="feature-badge">
                      <span>{feature}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFeature(index)} 
                        className="delete-btn-feature"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 font-semibold italic">No features defined yet. Add features below.</span>
                )}
              </div>

              {/* Input Feature Row */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="form-input-project flex-1" 
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 border border-slate-300 rounded text-slate-700 hover:bg-slate-300 text-xs font-bold"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="generate-btn mt-2"
            disabled={actionLoading}
          >
            <Save size={16} /> {view === 'create' ? 'Create Project Profile' : 'Save Modifications'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ProjectHub;
