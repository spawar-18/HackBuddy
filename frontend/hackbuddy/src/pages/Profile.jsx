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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white border border-neutral-200 rounded-xl p-6 md:p-8 shadow-xs flex flex-col gap-6 animate-slide-up">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-neutral-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2.5">
              <Terminal size={22} className="text-brand-500" />
              {user?.profileCompleted ? 'Edit Skills Configuration' : 'Mission Profile Configuration'}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {user?.profileCompleted 
                ? 'Update your system core nodes and technical skills directory.'
                : 'Establish your system core nodes. Pre-register your technical skills directory.'}
            </p>
          </div>
          {user?.profileCompleted ? (
            <button 
              className="btn-secondary text-xs" 
              onClick={() => navigate('/dashboard')}
            >
              Cancel & Return
            </button>
          ) : (
            <button className="btn-danger text-xs flex items-center gap-1.5" onClick={handleLogout}>
              <LogOut size={14} />
              Abort & Log Out
            </button>
          )}
        </div>

        {/* Resume AI Autopilot Section */}
        <div className="bg-neutral-50/50 border border-neutral-200/80 rounded-xl p-5 md:p-6 flex flex-col gap-4">
          <div className="text-xs font-bold text-neutral-500 tracking-wider uppercase flex items-center gap-2">
            <Cpu size={16} className="text-brand-500" />
            <span>AI Skills Autopilot (Resume Upload)</span>
          </div>
          <p className="text-xs text-neutral-500">
            Fast track your setup! Upload your PDF resume, and our AI Agent will extract and configure your developer skills node automatically.
          </p>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              dragActive 
                ? 'border-brand-500 bg-brand-50/20' 
                : selectedFile 
                  ? 'border-emerald-300 bg-emerald-50/20' 
                  : 'border-neutral-200 bg-white hover:bg-neutral-50/40'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <Terminal size={32} className="text-brand-500 mb-2" />
                <span className="text-sm font-semibold text-neutral-900 break-all">{selectedFile.name}</span>
                <span className="text-xs text-neutral-400 mt-0.5">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                
                <div className="flex gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800" 
                    onClick={handleResumeExtract}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        Extracting ({uploadProgress}%)
                      </>
                    ) : (
                      'Extract Skills'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary text-xs"
                    onClick={() => setSelectedFile(null)}
                    disabled={extracting}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="resume-file-input" className="w-full flex flex-col items-center cursor-pointer">
                <UploadCloud size={32} className="text-neutral-400 mb-2 hover:text-brand-500 transition-colors" />
                <span className="text-sm font-semibold text-neutral-800">Drag & Drop Resume PDF</span>
                <span className="text-xs text-neutral-400 mt-0.5">or click to browse local files (max 5MB)</span>
                <input 
                  type="file" 
                  id="resume-file-input" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {extracting && (
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span className="text-xs text-neutral-500 font-medium">{extractionProgress}</span>
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
            <span>1. Predefined Skills Library</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(predefinedSkills).map(category => (
              <div key={category} className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 border-b border-neutral-100 pb-2">
                  <span className="text-brand-500">{categoryDetails[category].icon}</span>
                  <span>{categoryDetails[category].label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {predefinedSkills[category].map(skill => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleSkill(skill)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-500 border-brand-500 text-white font-semibold shadow-xs' 
                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800'
                        }`}
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
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
            <span>2. Custom Skills Expansion</span>
          </div>
          <p className="text-xs text-neutral-500">
            Inject custom capabilities and tech stacks not registered in the default database index.
          </p>
          <form onSubmit={handleAddCustomSkill} className="flex gap-2 w-full max-w-md mt-1">
            <input
              type="text"
              className="input-field"
              placeholder="e.g. GraphQL, Redis, WebRTC"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-secondary shrink-0 text-xs py-2" disabled={loading}>
              <Plus size={14} />
              Add Node
            </button>
          </form>
        </div>

        {/* Selected Skills Inventory */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
            <span>3. Current Skill Inventory ({selectedSkills.length})</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 flex flex-col gap-3">
            {selectedSkills.length === 0 ? (
              <div className="text-xs text-neutral-400 italic text-center py-4">
                No active skills loaded. Toggle options in Category Panels or inject Custom Nodes above.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map(skill => (
                  <div key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold rounded-lg hover:border-brand-200 transition-all">
                    <span>{skill}</span>
                    <button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`} className="p-0.5 text-brand-500 hover:text-red-600 transition-colors cursor-pointer">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-neutral-100 pt-5 mt-2">
          <button 
            type="button" 
            className="btn-primary px-6 py-2.5 shadow-sm" 
            onClick={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
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
    </div>
  );
};

export default Profile;
