import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="max-w-md mx-auto p-4 sm:p-8 mt-12 w-full">
      <div className="bg-bg-card border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-accent-dim" />
        
        <div className="flex justify-center mb-8">
          <div className="bg-bg-secondary p-4 rounded-full border border-border group-hover:border-accent transition-colors">
            <Zap className="text-accent" size={32} />
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-text-primary mb-2 text-center">Entrar no RankFire</h1>
        <p className="text-text-secondary text-center mb-8">Faça login para gerenciar seus booyahs.</p>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-md text-danger flex items-center gap-2 font-bold text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Nick</label>
            <input 
              type="text" 
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Ex: jogador1"
              disabled={loading}
              className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors font-medium placeholder:text-text-muted disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Senha</label>
            <input 
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="********"
              disabled={loading}
              className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors font-medium placeholder:text-text-muted disabled:opacity-50"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg-primary font-bold py-3 rounded-md hover:bg-opacity-90 transition-all mt-6 shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Entrando...</> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
