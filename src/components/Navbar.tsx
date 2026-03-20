import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from '../lib/theme';
import { LogOut, Upload, Shield, Zap, LayoutDashboard, User, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <nav className="bg-bg-card border-b-2 border-accent p-4 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[20px] font-display font-[700] text-text-primary tracking-wide">
          <Zap className="text-accent" />
          RankFire
        </Link>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="flex items-center gap-2 bg-text-secondary/10 text-text-primary px-3 py-1.5 rounded-md font-bold hover:bg-text-secondary/20 transition-all border border-text-secondary/20">
                  <Shield size={16} className="text-warning" />
                  <span className="hidden sm:inline">Painel ADM</span>
                </Link>
              )}
              {user.role === 'PLAYER' && (
                <Link to="/dashboard" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
                  <LayoutDashboard size={18} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}
              <div className="flex items-center gap-3 ml-4 border-l border-border pl-4">
                <div className="w-8 h-8 flex items-center justify-center rounded-full border border-border bg-bg-secondary text-text-secondary font-bold text-xs">
                  {getInitials(user.nick)}
                </div>
                <span className="text-text-primary font-medium hidden sm:inline">{user.nick}</span>
                <button onClick={logout} className="text-text-secondary hover:text-danger p-1 rounded transition-colors" title="Sair">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 bg-accent text-bg-primary px-5 py-2 rounded-md font-bold hover:bg-opacity-90 transition-all"
            >
              <User size={18} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
