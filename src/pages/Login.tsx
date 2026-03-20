import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Zap, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export const Login: React.FC = () => {
  const [nick, setNick] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nick || !senha) {
      setError('Preencha os campos para continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('nick, password_hash, role, status')
        .eq('nick', nick)
        .single();

      if (dbError || !data) {
        setError('Nick ou senha incorretos');
        return;
      }

      if (data.status === 'BANIDO') {
        setError('Sua conta está banida. Entre em contato com o admin.');
        return;
      }

      const senhaCorreta = await bcrypt.compare(senha, data.password_hash);
      if (!senhaCorreta) {
        setError('Nick ou senha incorretos');
        return;
      }

      login({ nick: data.nick, role: data.role as 'ADMIN' | 'PLAYER' });
      navigate(data.role === 'ADMIN' ? '/admin' : '/dashboard');

    } catch (err) {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-10rem)] max-w-6xl mx-auto flex rounded-2xl overflow-hidden shadow-2xl bg-[#111] border border-border">
      {/* Esquerda */}
      <div className="hidden md:flex w-1/2 bg-accent flex-col items-center justify-center p-12 text-bg-primary relative overflow-hidden">
        <Zap className="absolute opacity-10 -right-20 -bottom-20 shrink-0" size={400} />
        <div className="z-10 text-center">
          <div className="bg-bg-primary text-accent w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Zap size={40} />
          </div>
          <h1 className="text-5xl lg:text-6xl font-display font-bold tracking-wide leading-none mb-4 uppercase">
            Prove que você<br/>é o melhor
          </h1>
          <p className="text-xl opacity-90 font-medium font-sans">Entre e suba no ranking da comunidade</p>
        </div>
      </div>

      {/* Direita */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 relative">
        <Link to="/" className="absolute top-6 left-6 text-text-secondary hover:text-accent font-bold transition-colors text-sm">
          &larr; Voltar ao ranking
        </Link>
        
        <div className="w-full max-w-sm mt-8 md:mt-0">
          <h2 className="text-4xl font-display font-bold text-text-primary mb-8 tracking-wide">Entrar</h2>

          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-md text-danger flex items-center gap-2 font-bold text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Nick</label>
              <input 
                type="text" 
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Ex: jogador1"
                disabled={loading}
                className="w-full bg-[#161616] border border-border rounded-lg p-3.5 text-text-primary focus:outline-none focus:border-accent transition-colors font-medium placeholder:text-[#444] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Senha</label>
              <input 
                type="password" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#161616] border border-border rounded-lg p-3.5 text-text-primary focus:outline-none focus:border-accent transition-colors font-medium placeholder:text-[#444] disabled:opacity-50"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-bg-primary font-bold py-4 rounded-lg hover:bg-opacity-90 transition-all mt-4 shadow-[0_4px_14px_0_rgba(255,107,26,0.39)] hover:shadow-[0_6px_20px_rgba(255,107,26,0.23)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Entrando...</> : 'Entrar na conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
