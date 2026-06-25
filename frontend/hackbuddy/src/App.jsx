import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import ProjectWorkspace from './pages/ProjectWorkspace';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
import TeamDetails from './pages/TeamDetails';
import JoinTeamByLink from './pages/JoinTeamByLink';
import ProtectedRoute from './components/ProtectedRoute';
import Chat from './components/Chat';
import { Toaster } from 'react-hot-toast';

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID environment variable is missing');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspace/:projectId" 
              element={
                <ProtectedRoute>
                  <ProjectWorkspace />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/team/create" 
              element={
                <ProtectedRoute>
                  <CreateTeam />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/team/join" 
              element={
                <ProtectedRoute>
                  <JoinTeam />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/team/:teamId" 
              element={
                <ProtectedRoute>
                  <TeamDetails />
                </ProtectedRoute>
              } 
            />
            <Route path="/join/:inviteCode" element={<JoinTeamByLink />} />

            {/* Chat Route */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            {/* Redirects */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
