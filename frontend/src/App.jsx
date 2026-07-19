import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layout/MainLayout';

const Charts = lazy(() => import('./pages/Charts'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Explainability = lazy(() => import('./pages/Explainability'));
const History = lazy(() => import('./pages/History'));
const Login = lazy(() => import('./pages/Login'));
const Prediction = lazy(() => import('./pages/Prediction'));
const Profile = lazy(() => import('./pages/Profile'));
const Register = lazy(() => import('./pages/Register'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 p-8 text-slate-200">Loading…</div>}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/prediction" element={<Prediction />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/explainability" element={<Explainability />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
