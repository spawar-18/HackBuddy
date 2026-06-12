import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  CheckCircle, AlertTriangle, Plus, X, Code, Database, 
  Cpu, Wrench, Palette, Brain, RefreshCw, LogOut, Terminal, UploadCloud 
} from 'lucide-react';

const Profile = () => {
  const { user, logout, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Resume Upload & AI Extraction State
  const [selectedFile, setSelectedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState('');

  // Define categorized predefined skills
  const predefinedSkills = {
    Frontend: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS'],
    Backend: ['Node.js', 'Express.js', 'Spring Boot', 'Django', 'Flask'],
    Database: ['MongoDB', 'MySQL', 'PostgreSQL', 'Firebase'],
    AI_ML: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'],
    DevOps: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    Design: ['UI/UX', 'Figma', 'Canva']
  };

  // Predefined category details for layout and icons
  const categoryDetails = {
    Frontend: { icon: <Code size={16} />, label: 'Frontend Architecture' },
    Backend: { icon: <Wrench size={16} />, label: 'Backend & APIs' },
    Database: { icon: <Database size={16} />, label: 'Databases & Storage' },
    AI_ML: { icon: <Brain size={16} />, label: 'AI & Data Science' },
    DevOps: { icon: <Cpu size={16} />, label: 'DevOps & Cloud' },
    Design: { icon: <Palette size={16} />, label: 'UI/UX & Design' }
  };

  // Sync user's existing skills on mount
  useEffect(() => {
    if (user && user.skills) {
      setSelectedSkills(user.skills);
    }
  }, [user]);

  // Handle pending invite code check
  useEffect(() => {
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (pendingCode && user && user.profileCompleted) {
      localStorage.removeItem('pendingInviteCode');
      navigate(`/join/${pendingCode}`);
    }
  }, [user, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        showNotification('Invalid file type. Only PDF resumes are allowed.', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf') {
        showNotification('Invalid file type. Only PDF resumes are allowed.', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleResumeExtract = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification('Please choose a PDF resume first.', 'error');
      return;
    }

    setExtracting(true);
    setExtractionProgress('Uploading PDF resume...');
    
    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const response = await api.post('/profile/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
          if (progress === 100) {
            setExtractionProgress('Analyzing resume text with AI agent...');
          }
        }
      });

      const { extractedSkills, success } = response.data;
      if (success && Array.isArray(extractedSkills)) {
        // Merge with existing skills, preventing duplicates (case-insensitive)
        const currentLower = selectedSkills.map(s => s.toLowerCase());
        const newUnique = extractedSkills.filter(
          skill => !currentLower.includes(skill.toLowerCase())
        );

        if (newUnique.length > 0) {
          setSelectedSkills(prev => [...prev, ...newUnique]);
          showNotification(`Successfully extracted and merged ${newUnique.length} new skills!`, 'success');
        } else {
          showNotification('Resume skills extracted successfully, but they were already in your profile.', 'success');
        }
      }
      
      // Reset file selection after successful extraction
      setSelectedFile(null);
      setUploadProgress(0);
      setExtractionProgress('');
    } catch (error) {
      console.error('Resume extraction failed:', error);
      const errorMsg = error.response?.data?.message || 'Failed to extract skills from resume.';
      showNotification(errorMsg, 'error');
    } finally {
      setExtracting(false);
    }
  };

  // Show toast notification
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Toggle predefined skill selection
  const handleToggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  // Add custom skill
  const handleAddCustomSkill = (e) => {
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (!trimmed) return;

    // Validation: Prevent duplicates
    const isDuplicate = selectedSkills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      showNotification(`"${trimmed}" is already added to your skills.`, 'error');
      return;
    }

    setSelectedSkills(prev => [...prev, trimmed]);
    setCustomSkill('');
    showNotification(`Added custom skill: ${trimmed}`, 'success');
  };

  // Remove skill chip
  const handleRemoveSkill = (skillToRemove) => {
    setSelectedSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  // Submit / Save Profile
  const handleSaveProfile = async () => {
    // Validation: Require at least one skill to complete profile
    if (selectedSkills.length === 0) {
      showNotification('Please select or add at least one skill to save your profile.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/profile', { skills: selectedSkills });
      
      // Update the user session in AuthContext by reloading profile
      // If our AuthContext uses state, we want to reload or update the state.
      // Wait, let's force route navigate to dashboard; ProtectedRoute will re-validate if needed.
      showNotification('Profile updated successfully! Welcome to the HUD Dashboard.', 'success');
      
      // Trigger a redirect after toast is visible
      setTimeout(() => {
        // Force session refresh by reloading page or using auth context if we had a sync method.
        // We'll update the local storage token and user object if needed.
        const token = localStorage.getItem('token');
        if (token && response.data) {
          // Update cached user object in AuthContext by mutating or redirecting.
          // Since AuthContext reads from state, let's check if we can update the state.
          // In App.jsx, the user session will be fetched on verifyToken. Let's redirect to dashboard:
          window.location.href = '/dashboard';
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (error) {
      console.error('Save Profile failed:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-selection-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Styled Layout Styles */}
      <style>{`
        .profile-selection-page {
          background-color: var(--bg-deep);
          min-height: 100vh;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2.5rem 1rem;
        }

        .profile-card {
          width: 100%;
          max-width: 900px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1.5rem;
        }

        .profile-brand-title {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-tagline {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .logout-btn-nav {
          background: var(--danger-glow);
          color: var(--danger);
          border: 1px solid var(--danger);
          border-radius: var(--radius-default);
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .logout-btn-nav:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .profile-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--primary);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .category-card {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }

        .category-header svg {
          color: var(--primary);
        }

        .skills-pills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .skill-pill {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: var(--radius-full);
          padding: 0.35rem 0.75rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .skill-pill:hover {
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        .skill-pill.selected {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          font-weight: 600;
          box-shadow: 0 2px 4px var(--primary-glow);
        }

        .inventory-card {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .inventory-placeholder {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 1.5rem 0;
        }

        .selected-chip {
          background: var(--primary-glow);
          border: 1px solid var(--border);
          color: var(--primary);
          font-weight: 600;
          border-radius: var(--radius-full);
          padding: 0.4rem 0.9rem;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .selected-chip:hover {
          border-color: var(--primary-hover);
        }

        .selected-chip button {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          opacity: 0.7;
          transition: all 0.15s ease;
        }

        .selected-chip button:hover {
          color: var(--danger);
          opacity: 1;
        }

        .custom-skill-form {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          max-width: 450px;
        }

        .custom-skill-input {
          flex: 1;
          background-color: var(--bg-card-solid);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius-default);
          padding: 0.65rem 1rem;
          font-size: 0.85rem;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .custom-skill-input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        .btn-add-custom {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: var(--radius-default);
          padding: 0 1.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .btn-add-custom:hover {
          background: var(--bg-deep);
          border-color: var(--text-muted);
        }

        .action-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--border);
          padding-top: 1.5rem;
        }

        .btn-save-profile {
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-default);
          padding: 0.75rem 2rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .btn-save-profile:hover:not(:disabled) {
          background: var(--primary-hover);
          box-shadow: 0 6px 16px var(--primary-glow);
        }

        .btn-save-profile:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.5rem;
          border-radius: var(--radius-default);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          background: var(--bg-card-solid);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast-success {
          border: 1px solid var(--success);
          color: var(--success);
        }

        .toast-success svg {
          color: var(--success);
        }

        .toast-error {
          border: 1px solid var(--danger);
          color: var(--danger);
        }

        .toast-error svg {
          color: var(--danger);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%) translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }

        .resume-section {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .drag-drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-deep);
          padding: 2.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .drag-drop-zone.drag-active {
          border-color: var(--primary);
          background: var(--primary-glow);
        }

        .drag-drop-zone.file-loaded {
          border-color: var(--success);
          background: var(--success-glow);
          border-style: solid;
        }

        .file-input-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          cursor: pointer;
        }

        .upload-cloud-icon {
          color: var(--text-muted);
          margin-bottom: 0.75rem;
          transition: transform 0.2s ease;
        }

        .file-input-label:hover .upload-cloud-icon {
          transform: translateY(-2px);
          color: var(--primary);
        }

        .upload-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .upload-subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .file-preview-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .file-name-text {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
          word-break: break-all;
        }

        .file-preview-info svg {
          color: var(--primary);
        }

        .file-size-text {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
        }

        .btn-extract-skills {
          background: var(--success);
          color: #fff;
          border: none;
          border-radius: var(--radius-default);
          padding: 0.5rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-extract-skills:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-cancel-file {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: var(--radius-default);
          padding: 0.5rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel-file:hover {
          background: var(--bg-deep);
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        .extraction-status-bar {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .progress-bar-container {
          height: 6px;
          background: var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--success);
          border-radius: var(--radius-sm);
          transition: width 0.25s ease;
        }

        .progress-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
      `}</style>

      <div className="profile-card">
        {/* Header Block */}
        <div className="profile-header">
          <div>
            <h1 className="profile-brand-title">
              <Terminal size={24} style={{ color: 'var(--primary-hover)' }} />
              {user?.profileCompleted ? 'Edit Skills Configuration' : 'Mission Profile Configuration'}
            </h1>
            <p className="profile-tagline">
              {user?.profileCompleted 
                ? 'Update your system core nodes and technical skills directory.'
                : 'Establish your system core nodes. Pre-register your technical skills directory.'}
            </p>
          </div>
          {user?.profileCompleted ? (
            <button 
              className="logout-btn-nav" 
              style={{ background: 'none', color: '#64748b', borderColor: '#cbd5e1' }}
              onClick={() => navigate('/dashboard')}
            >
              Cancel & Return
            </button>
          ) : (
            <button className="logout-btn-nav" onClick={handleLogout}>
              <LogOut size={14} />
              Abort & Log Out
            </button>
          )}
        </div>

        {/* Resume AI Autopilot Section */}
        <div className="resume-section">
          <div className="profile-section-title">
            <Cpu size={18} style={{ color: 'var(--primary)' }} />
            <span>AI Skills Autopilot (Resume Upload)</span>
          </div>
          <p className="profile-tagline" style={{ marginBottom: '1.25rem' }}>
            Fast track your setup! Upload your PDF resume, and our AI Agent will extract and configure your developer skills node automatically.
          </p>

          <div 
            className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-loaded' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="file-preview-info">
                <Terminal size={32} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <span className="file-name-text">{selectedFile.name}</span>
                <span className="file-size-text">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn-extract-skills" 
                    onClick={handleResumeExtract}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <>
                        <RefreshCw className="spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                        Extracting ({uploadProgress}%)
                      </>
                    ) : (
                      'Extract Skills'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn-cancel-file"
                    onClick={() => setSelectedFile(null)}
                    disabled={extracting}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="resume-file-input" className="file-input-label">
                <UploadCloud size={36} className="upload-cloud-icon" />
                <span className="upload-title">Drag & Drop Resume PDF</span>
                <span className="upload-subtitle">or click to browse local files (max 5MB)</span>
                <input 
                  type="file" 
                  id="resume-file-input" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {extracting && (
            <div className="extraction-status-bar">
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span className="progress-text">{extractionProgress}</span>
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div>
          <div className="profile-section-title">
            <span>1. Predefined Skills Library</span>
          </div>
          <div className="categories-grid">
            {Object.keys(predefinedSkills).map(category => (
              <div key={category} className="category-card">
                <div className="category-header">
                  {categoryDetails[category].icon}
                  <span>{categoryDetails[category].label}</span>
                </div>
                <div className="skills-pills-container">
                  {predefinedSkills[category].map(skill => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleSkill(skill)}
                        className={`skill-pill ${isSelected ? 'selected' : ''}`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Skill Section */}
        <div>
          <div className="profile-section-title">
            <span>2. Custom Skills Expansion</span>
          </div>
          <p className="profile-tagline" style={{ marginBottom: '0.75rem' }}>
            Inject custom capabilities and tech stacks not registered in the default database index.
          </p>
          <form onSubmit={handleAddCustomSkill} className="custom-skill-form">
            <input
              type="text"
              className="custom-skill-input"
              placeholder="e.g. GraphQL, Redis, WebRTC"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-add-custom" disabled={loading}>
              <Plus size={16} />
              Add Node
            </button>
          </form>
        </div>

        {/* Selected Skills Inventory */}
        <div>
          <div className="profile-section-title">
            <span>3. Current Skill Inventory ({selectedSkills.length})</span>
          </div>
          <div className="inventory-card">
            {selectedSkills.length === 0 ? (
              <div className="inventory-placeholder">
                No active skills loaded. Toggle options in Category Panels or inject Custom Nodes above.
              </div>
            ) : (
              <div className="skills-pills-container" style={{ gap: '0.75rem' }}>
                {selectedSkills.map(skill => (
                  <div key={skill} className="selected-chip">
                    <span>{skill}</span>
                    <button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="action-footer">
          <button 
            type="button" 
            className="btn-save-profile" 
            onClick={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="spin" size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                {user?.profileCompleted ? 'Saving Changes...' : 'Initializing System...'}
              </>
            ) : (
              <>
                {user?.profileCompleted ? 'Save Changes' : 'Initialize Flight Deck'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
