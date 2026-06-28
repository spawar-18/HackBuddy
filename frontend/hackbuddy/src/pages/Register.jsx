import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, googleLogin, githubLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      // Clear URL parameter so it doesn't trigger again on reload
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const processGithubLogin = async () => {
        setLoading(true);
        setError('');
        const result = await githubLogin(code);
        setLoading(false);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.message);
        }
      };
      processGithubLogin();
    }
  }, [githubLogin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setError('');
    setLoading(true);

    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    const result = await googleLogin(credentialResponse.credential);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  const handleGithubClick = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liqB2A1xtgmfmNhr';
    const redirectUri = `${window.location.origin}/login`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    window.location.href = githubUrl;
  };
  return (
    <div className="hackos-auth-page">
      <div className="hackos-auth-card">
        {/* Centered Brand Header */}
        <div className="hackos-brand-header">
          <div className="hackos-brand-logo-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <h1 className="hackos-brand-title">HackBuddy</h1>
          <p className="hackos-brand-tagline">Create your flight deck account</p>
        </div>

        <div className="hackos-inner-card">
          {error && (
            <div className="error-alert">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="hackos-form-group">
              <label htmlFor="name" className="hackos-label">FULL NAME</label>
              <input
                type="text"
                id="name"
                className="hackos-input"
                placeholder="Your Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="hackos-form-group">
              <label htmlFor="email" className="hackos-label">EMAIL ADDRESS</label>
              <input
                type="email"
                id="email"
                className="hackos-input"
                placeholder="xyz@hackos.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="hackos-form-group">
              <label htmlFor="password" className="hackos-label">PASSWORD</label>
              <div className="hackos-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="hackos-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="hackos-input-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="hackos-checkbox-row">
              <input
                type="checkbox"
                id="agreed"
                className="hackos-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
                required
              />
              <label htmlFor="agreed" className="hackos-checkbox-text">
                I agree to the{' '}
                <a href="#terms" className="hackos-link" onClick={(e) => { e.preventDefault(); alert("Terms of Service is a mockup."); }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#privacy" className="hackos-link" onClick={(e) => { e.preventDefault(); alert("Privacy Policy is a mockup."); }}>Privacy Policy</a>.
              </label>
            </div>

            <button type="submit" className="hackos-btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="hackos-divider">OR CONTINUE WITH</div>

          <div className="hackos-social-row">
            <div className="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width="200"
              />
            </div>

            <button type="button" className="hackos-social-btn" onClick={handleGithubClick}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ color: 'var(--text-heading)' }} className="shrink-0">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>
        </div>

        <p className="hackos-footer">
          Already have an account?{' '}
          <Link to="/login" className="hackos-link font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

