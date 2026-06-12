import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={spinnerContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Authenticating Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect flows based on profileCompleted status
  if (!user.profileCompleted && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

const spinnerContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#ffffff',
  fontFamily: "'Outfit', 'Inter', sans-serif"
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '3px solid #e2e8f0',
  borderTop: '3px solid #2563eb',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

// Insert a small keyframe style into document if needed, but simple CSS handles it.
export default ProtectedRoute;
