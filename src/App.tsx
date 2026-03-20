import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Navbar } from './components/Navbar';
import { Loader2 } from 'lucide-react';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col">
          <Navbar />
          <main className="flex-1 w-full">
            <Suspense fallback={<div className="flex h-[50vh] items-center justify-center text-text-secondary gap-3"><Loader2 size={24} className="animate-spin text-accent" />Carregando...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
