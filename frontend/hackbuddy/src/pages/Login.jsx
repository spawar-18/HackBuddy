import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, googleLogin, githubLogin } = useAuth();
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
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(email, password);
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

  const handleForgotClick = (e) => {
    e.preventDefault();
    alert("Password recovery is currently disabled on this instance.");
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
            {/* Custom Terminal Icon [>-] */}
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <h1 className="hackos-brand-title">HackBuddy</h1>
          <p className="hackos-brand-tagline"><i>Your personal assistant for hackathons.</i></p>
        </div>

        {/* Inner White Form Card */}
        <div className="hackos-inner-card">
          {error && (
            <div className="error-alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="hackos-form-group">
              <div className="hackos-label-row">
                <label htmlFor="email" className="hackos-label">EMAIL ADDRESS</label>
              </div>
              <div className="hackos-input-wrapper">
                <input
                  type="email"
                  id="email"
                  className="hackos-input"
                  placeholder="dev@hackos.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="hackos-form-group" style={{ marginBottom: '1.75rem' }}>
              <div className="hackos-label-row">
                <label htmlFor="password" className="hackos-label">PASSWORD</label>
                <a href="#forgot" className="hackos-link" onClick={handleForgotClick}>Forgot?</a>
              </div>
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

            <button type="submit" className="hackos-btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="hackos-divider">OR CONTINUE WITH</div>

          {/* Social Row: Google and GitHub */}
          <div className="hackos-social-row">
            {/* Google Button with Overlay */}
            <div className="google-overlay-container">
              <div className="google-overlay-iframe-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  width="180"
                />
              </div>
              <div className="google-overlay-custom-btn">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.05c2.37-2.18 3.73-5.39 3.73-8.75z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.05-3.13c-1.12.75-2.56 1.2-3.91 1.2-3.02 0-5.58-2.04-6.49-4.78H1.31v3.23A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.51 14.38A7.16 7.16 0 0 1 5.1 12c0-.83.14-1.64.41-2.38V6.39H1.31A12 12 0 0 0 0 12c0 2.21.6 4.3 1.31 5.61l4.2-3.23z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.93 11.93 0 0 0 12 0 12 12 0 0 0 1.31 6.39l4.2 3.23c.91-2.74 3.47-4.78 6.49-4.78z" />
                </svg>
                Google
              </div>
            </div>

            {/* GitHub Button */}
            <button type="button" className="hackos-social-btn" onClick={handleGithubClick}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ color: '#181717' }}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="hackos-footer">
          New to the mission?{' '}
          <Link to="/register" className="hackos-link" style={{ fontWeight: 700 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

