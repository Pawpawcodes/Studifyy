import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { StoreProvider, useStore } from './context/StoreContext';
import { AudioProvider } from './context/AudioContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Layout } from './components/Layout';
import { LandingPage } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { ExplainPage } from './pages/Explain';
import { QuizPage } from './pages/Quiz';
import { FlashcardsPage } from './pages/Flashcards';
import { DoubtPage } from './pages/Doubt';
import { PlannerPage } from './pages/Planner';
import { SettingsPage } from './pages/Settings';
import Login from './pages/Login';
import { ChatWidget } from './components/ChatWidget';
import { TestSuite } from './pages/TestSuite';
import { AuthBar } from './components/AuthBar';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { onboardingComplete } = useStore();
  const { session } = useAuth();

  // If authenticated but onboarding not complete, force onboarding
  if (session && !onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/v1/callback" element={<Login />} />

      {/* Public Landing (only if not logged in) */}
      <Route
        path="/landing"
        element={!session ? <LandingPage /> : <Navigate to="/" replace />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explain"
        element={
          <ProtectedRoute>
            <Layout>
              <ExplainPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz"
        element={
          <ProtectedRoute>
            <Layout>
              <QuizPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcards"
        element={
          <ProtectedRoute>
            <Layout>
              <FlashcardsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doubt"
        element={
          <ProtectedRoute>
            <Layout>
              <DoubtPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <Layout>
              <PlannerPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/uploads"
        element={
          <ProtectedRoute>
            <Layout>
              <DoubtPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Hidden Test Route */}
      <Route path="/test" element={<TestSuite />} />

      {/* Default Catch-all */}
      <Route
        path="*"
        element={<Navigate to={session ? '/' : '/landing'} replace />}
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StoreProvider>
        <AudioProvider>
          {/* Top bar always visible */}
          <AuthBar />
          {/* Routes below */}
          <AppRoutes />
          {/* Floating chat widget */}
          <ChatWidget />
        </AudioProvider>
      </StoreProvider>
    </AuthProvider>
  );
};

export default App;
