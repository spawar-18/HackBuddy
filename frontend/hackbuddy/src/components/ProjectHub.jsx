import React, { useState, useEffect } from 'react';
import { 
  createProject, 
  getProjectByTeam, 
  updateProject, 
  deleteProject 
} from '../services/projectService';
import { toast } from 'react-hot-toast';
import { 
  FolderGit2, Plus, Trash2, Edit3, ListTodo, 
  Play, CheckCircle, Clock, ArrowLeft, Save, AlertTriangle, RefreshCw
} from 'lucide-react';

const ProjectHub = ({ teamId }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'edit'
  
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

  // Handle Create Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name is required.');
      return;
    }

    try {
      setActionLoading(true);
      const projectData = {
        projectName,
        problemStatement,
        description,
        track,
        duration,
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

    try {
      setActionLoading(true);
      const projectData = {
        projectName,
        problemStatement,
        description,
        track,
        duration,
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
        .project-hub-card {
          position: relative;
          overflow: hidden;
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

          {project.problemStatement && (
            <div>
              <span className="project-section-title">Problem Statement</span>
              <div className="info-block">
                <p className="info-value">{project.problemStatement}</p>
              </div>
            </div>
          )}

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

          <div className="form-group-project">
            <label className="form-label-project">Problem Statement</label>
            <textarea 
              rows={2}
              className="form-input-project" 
              placeholder="Define the problem your project aims to solve..."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
            />
          </div>

          <div className="form-group-project">
            <label className="form-label-project">Description</label>
            <textarea 
              rows={3}
              className="form-input-project" 
              placeholder="Provide a detailed description of your hackathon project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
              <label className="form-label-project">Duration (e.g. 24h, 3 days)</label>
              <input 
                type="text" 
                className="form-input-project" 
                placeholder="e.g. 36 hours" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

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
