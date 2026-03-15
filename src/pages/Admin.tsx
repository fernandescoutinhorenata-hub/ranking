import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router-dom';
import { Check, X, Maximize2, AlertTriangle, Users, Plus, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface Submission {
  id: string;
  image_url: string;
  created_at: string;
  users: { nick: string };
}

interface Player {
  id: string;
  nick: string;
  weekly_points: number;
  total_points: number;
  status: 'ATIVO' | 'BANIDO';
}

export const Admin: React.FC = () => {
  const { user } = useAuth();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCreatePlayerOpen, setIsCreatePlayerOpen] = useState(false);
  const [newNick, setNewNick] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newSenhaConf, setNewSenhaConf] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  // Reset Password states
  const [isPasswordListOpen, setIsPasswordListOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Player | null>(null);
  const [resetSenha, setResetSenha] = useState('');
  const [resetSenhaConf, setResetSenhaConf] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;

  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);

    const [{ data: subs }, { data: playersData }] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, image_url, created_at, users(nick)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true }),
      supabase
        .from('users')
        .select('id, nick, weekly_points, total_points, status')
        .order('weekly_points', { ascending: false })
    ]);

    if (subs) setSubmissions(subs as any);
    if (playersData) setPlayers(playersData as any);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    const sub = submissions.find(s => s.id === id);

    if (action === 'approve' && sub) {
      // Atualiza status da submission
      await supabase.from('submissions').update({
        status: 'APPROVED',
        reviewed_by: user.nick,
        reviewed_at: new Date().toISOString()
      }).eq('id', id);

      // Incrementa pontos do jogador (weekly + total)
      const playerNick = sub.users.nick;
      const { data: playerData } = await supabase
        .from('users')
        .select('weekly_points, total_points')
        .eq('nick', playerNick)
        .single();

      if (playerData) {
        await supabase.from('users').update({
          weekly_points: playerData.weekly_points + 1,
          total_points: playerData.total_points + 1,
        }).eq('nick', playerNick);
      }

      showToast('Print aprovada! +1 ponto para o jogador ✓', 'success');
    } else {
      await supabase.from('submissions').update({
        status: 'REJECTED',
        reviewed_by: user.nick,
        reviewed_at: new Date().toISOString()
      }).eq('id', id);
      showToast('Print recusada', 'error');
    }

    setSubmissions(prev => prev.filter(s => s.id !== id));
    setActionLoading(null);
  };

  const handleResetConfirm = async () => {
    setIsResetModalOpen(false);
    await supabase.from('users').update({ weekly_points: 0 }).neq('id', '');

    // Registra o reset
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    await supabase.from('weekly_resets').upsert({ week_number: weekNumber });
    
    setPlayers(prev => prev.map(p => ({ ...p, weekly_points: 0 })));
    showToast('Ranking Semanal resetado com sucesso ✓', 'success');
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNick || !newSenha || !newSenhaConf) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    if (newSenha !== newSenhaConf) {
      showToast('Senhas não conferem', 'error');
      return;
    }
    setCreatingPlayer(true);

    const hash = await bcrypt.hash(newSenha, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ nick: newNick, password_hash: hash, role: 'PLAYER' })
      .select()
      .single();

    if (error) {
      showToast(error.code === '23505' ? 'Nick já existe' : 'Erro ao criar jogador', 'error');
    } else {
      setPlayers(prev => [...prev, data]);
      setIsCreatePlayerOpen(false);
      setNewNick(''); setNewSenha(''); setNewSenhaConf('');
      showToast('Jogador criado com sucesso!', 'success');
    }
    setCreatingPlayer(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetSenha.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    if (resetSenha !== resetSenhaConf) {
      showToast('As senhas não conferem', 'error');
      return;
    }
    setSavingPassword(true);
    const hash = await bcrypt.hash(resetSenha, 10);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', resetTarget.id);

    if (error) {
      showToast('Erro ao resetar senha', 'error');
    } else {
      showToast(`Senha de ${resetTarget.nick} resetada com sucesso ✓`, 'success');
      setResetTarget(null);
      setResetSenha('');
      setResetSenhaConf('');
    }
    setSavingPassword(false);
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const formatDate = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora mesmo';
    if (mins < 60) return `há ${mins} min`;
    return `há ${Math.floor(mins / 60)}h`;
  };

  const pendingCount = submissions.length;
  const approvedToday = players.reduce((acc, p) => acc + p.weekly_points, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 relative">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-lg font-bold shadow-2xl flex items-center gap-2 ${
              toastMessage.type === 'success' ? 'bg-accent text-bg-primary' : 
              toastMessage.type === 'error' ? 'bg-danger text-text-primary' : 
              'bg-bg-card text-text-primary border border-border'
            }`}
          >
            {toastMessage.type === 'success' && <Check size={18} />}
            {toastMessage.type === 'error' && <X size={18} />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2 flex items-center gap-2">
            <ShieldCheck className="text-warning" size={32} />
            Painel ADM
          </h1>
          <p className="text-text-secondary">Revisão de Booyahs e administração de players.</p>
        </div>
        <button 
          onClick={() => setIsResetModalOpen(true)}
          className="bg-danger/10 text-danger border border-danger/20 px-4 py-2 rounded-md font-bold hover:bg-danger hover:text-text-primary transition-all flex items-center gap-2 cursor-pointer"
        >
          <AlertTriangle size={18} />
          Resetar Ranking Semanal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Pendentes</div>
          <div className="text-4xl font-display font-bold text-warning">{loading ? '–' : pendingCount}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Pontos na Semana</div>
          <div className="text-4xl font-display font-bold text-accent">{loading ? '–' : approvedToday}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">Total de Jogadores</div>
          <div className="text-4xl font-display font-bold text-text-primary">{loading ? '–' : players.length}</div>
        </div>
      </div>

      {/* Gerenciar Jogadores */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <Users className="text-text-secondary" />
            Gerenciar Jogadores
          </h2>
          <button 
            onClick={() => setIsCreatePlayerOpen(true)}
            className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg-primary px-4 py-2 rounded-md font-bold transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Criar Jogador
          </button>
          <button 
            onClick={() => setIsPasswordListOpen(true)}
            className="border border-accent text-accent hover:bg-accent hover:text-bg-primary px-4 py-2 rounded-md font-bold transition-all flex items-center gap-2"
          >
            <KeyRound size={18} /> Resetar Senhas
          </button>
        </div>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg-secondary text-text-secondary text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold">Nick</th>
                  <th className="p-4 font-bold">Semana</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-text-secondary"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : players.map(p => (
                  <tr key={p.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="p-4 font-bold text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-bg-primary border border-border flex items-center justify-center text-xs text-text-secondary">
                          {getInitials(p.nick)}
                        </div>
                        {p.nick}
                      </div>
                    </td>
                    <td className="p-4 text-accent font-display font-bold text-lg">{p.weekly_points}</td>
                    <td className="p-4 text-text-primary font-display font-bold text-lg">{p.total_points}</td>
                    <td className="p-4">
                      {p.status === 'ATIVO' ? (
                        <span className="bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-bold border border-accent/20">Ativo</span>
                      ) : (
                        <span className="bg-danger/10 text-danger px-2 py-1 rounded-md text-xs font-bold border border-danger/20">Banido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-display font-bold text-text-primary mb-4">Fila de Revisão (FIFO)</h2>
      
      {loading ? (
        <div className="flex justify-center py-12 text-text-secondary gap-2">
          <Loader2 size={20} className="animate-spin text-accent" /> Carregando...
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center text-text-secondary">
          Nenhum Booyah pendente de revisão. Bom trabalho!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {submissions.map((sub) => (
              <motion.div 
                key={sub.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                className="bg-bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4"
              >
                <div 
                  className="relative w-full sm:w-48 aspect-video bg-bg-primary rounded-lg overflow-hidden cursor-pointer group border border-border shrink-0"
                  onClick={() => setSelectedImage(sub.image_url)}
                >
                  <img src={sub.image_url} alt="Booyah" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                    <Maximize2 className="text-text-primary" size={24} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
                        {getInitials(sub.users.nick)}
                      </div>
                      <span className="text-text-primary font-bold">{sub.users.nick}</span>
                    </div>
                    <div className="text-sm text-text-secondary mb-4">{formatDate(sub.created_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReview(sub.id, 'approve')}
                      disabled={actionLoading === sub.id}
                      className="flex-1 bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg-primary py-2 rounded-md font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === sub.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />} Aprovar
                    </button>
                    <button 
                      onClick={() => handleReview(sub.id, 'reject')}
                      disabled={actionLoading === sub.id}
                      className="flex-1 bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-text-primary py-2 rounded-md font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === sub.id ? <Loader2 size={16} className="animate-spin" /> : <X size={18} />} Recusar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Booyah Fullscreen" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-text-primary hover:text-danger bg-black/50 rounded-full p-2 transition-colors cursor-pointer" onClick={() => setSelectedImage(null)}>
            <X size={24} />
          </button>
        </div>
      )}

      {/* Reset Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsResetModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-bg-card border border-border rounded-xl p-6 z-10 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-display font-bold text-danger mb-2 flex items-center gap-2">
                <AlertTriangle size={24} /> Resetar Ranking
              </h3>
              <p className="text-text-secondary mb-6">Tem certeza que deseja zerar o ranking semanal de todos os jogadores? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsResetModalOpen(false)} className="flex-1 bg-bg-secondary text-text-primary border border-border hover:bg-border py-2 rounded-md font-bold transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleResetConfirm} className="flex-1 bg-danger text-text-primary border border-danger hover:bg-red-600 py-2 rounded-md font-bold transition-colors cursor-pointer">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Player Modal */}
      <AnimatePresence>
        {isCreatePlayerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreatePlayerOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-bg-card border border-border rounded-xl p-6 z-10 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                  <Plus size={24} className="text-accent" /> Criar Jogador
                </h3>
                <button onClick={() => setIsCreatePlayerOpen(false)} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreatePlayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Nick</label>
                  <input type="text" required value={newNick} onChange={(e) => setNewNick(e.target.value)} className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Senha</label>
                  <input type="password" required value={newSenha} onChange={(e) => setNewSenha(e.target.value)} className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Confirmar Senha</label>
                  <input type="password" required value={newSenhaConf} onChange={(e) => setNewSenhaConf(e.target.value)} className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors" />
                </div>
                <button type="submit" disabled={creatingPlayer} className="w-full bg-accent text-bg-primary font-bold py-3 rounded-md hover:bg-opacity-90 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70">
                  {creatingPlayer ? <><Loader2 size={18} className="animate-spin" /> Criando...</> : 'Criar Jogador'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password List Modal */}
      <AnimatePresence>
        {isPasswordListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPasswordListOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-bg-card border border-border rounded-xl p-6 z-10 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                  <KeyRound size={22} className="text-accent" /> Resetar Senhas
                </h3>
                <button onClick={() => setIsPasswordListOpen(false)} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {players.filter(p => p.nick !== user.nick).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border hover:border-accent/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-bg-primary border border-border flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                      {getInitials(p.nick)}
                    </div>
                    <span className="flex-1 font-bold text-text-primary">{p.nick}</span>
                    <button
                      onClick={() => { setResetTarget(p); setIsPasswordListOpen(false); }}
                      className="text-xs font-bold px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent hover:text-bg-primary transition-all"
                    >
                      Resetar
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Form Modal */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setResetTarget(null); setResetSenha(''); setResetSenhaConf(''); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-bg-card border border-border rounded-xl p-6 z-10 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                  <KeyRound size={22} className="text-accent" /> Nova senha
                </h3>
                <button onClick={() => { setResetTarget(null); setResetSenha(''); setResetSenhaConf(''); }} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
              </div>
              <p className="text-text-secondary text-sm mb-5">Definir nova senha para <strong className="text-text-primary">{resetTarget.nick}</strong></p>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Nova Senha</label>
                  <input
                    type="password" required minLength={6}
                    value={resetSenha} onChange={e => setResetSenha(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Confirmar Senha</label>
                  <input
                    type="password" required minLength={6}
                    value={resetSenhaConf} onChange={e => setResetSenhaConf(e.target.value)}
                    placeholder="repita a senha"
                    className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setResetTarget(null); setResetSenha(''); setResetSenhaConf(''); }}
                    className="flex-1 bg-bg-secondary text-text-primary border border-border hover:bg-border py-2.5 rounded-md font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={savingPassword}
                    className="flex-1 bg-accent text-bg-primary font-bold py-2.5 rounded-md hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {savingPassword ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
