import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Navbar } from './components/Navbar';
import { Loader2 } from 'lucide-react';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const CeloMaster = lazy(() => import('./pages/CeloMaster').then(module => ({ default: module.CeloMaster })));

const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === '/celo-master';
  
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className="flex-1 w-full">
        <Suspense fallback={<div className="flex h-[50vh] items-center justify-center text-text-secondary gap-3"><Loader2 size={24} className="animate-spin text-accent" />Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/celo-master" element={<CeloMaster />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
