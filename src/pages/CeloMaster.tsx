import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Key, Trash2, Activity, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for our data
interface Admin {
  id: string;
  nick: string;
  created_at: string;
}

interface User {
  id: string;
  nick: string;
  role: string;
  created_at: string;
}

interface Stats {
  totalPlayers: number;
  totalAdmins: number;
  pendingSubmissions: number;
  weeklyPoints: number;
}

export const CeloMaster: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');
  const navigate = useNavigate();

  // Toast State
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (sessionStorage.getItem('master') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Wrestling2015*') {
      sessionStorage.setItem('master', 'true');
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('master');
    navigate('/');
  };

  const masterFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer Wrestling2015*',
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      handleLogout();
      throw new Error('Acesso não autorizado');
    }
    return res;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#000000] flex flex-col items-center justify-center p-4">
        <h1 className="text-[48px] font-display text-accent mb-2 tracking-wide text-center leading-none">
          ACESSO RESTRITO
        </h1>
        <p className="text-[#444] font-sans mb-12 text-center text-lg">
          Área exclusiva do administrador master
        </p>

        <form onSubmit={handleLogin} className="w-[320px] flex flex-col gap-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
              placeholder="Senha mestre"
              className={`w-full bg-[#111] border ${loginError ? 'border-danger' : 'border-[#222]'} rounded-md p-4 text-text-primary focus:outline-none focus:border-accent transition-colors font-sans text-center placeholder:text-[#444]`}
            />
            {loginError && (
              <p className="text-danger text-sm text-center mt-2 font-bold">Acesso negado</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-accent text-bg-primary font-bold py-4 rounded-md hover:bg-opacity-90 transition-all uppercase tracking-wider"
          >
            ENTRAR
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-text-primary font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[9999] px-6 py-3 rounded-lg font-bold shadow-lg bg-accent text-bg-primary flex items-center gap-2"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar Master */}
      <nav className="bg-[#000] border-b-2 border-accent px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="text-[28px] font-display text-accent tracking-wide leading-none flex items-center gap-2">
          ⚡ MASTER PANEL
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-danger text-white px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">
            Acesso Master
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-text-secondary hover:text-danger border border-transparent hover:border-danger/30 px-3 py-1.5 rounded-md transition-all text-sm font-bold"
          >
            <LogOut size={16} /> SAIR
          </button>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row max-w-[1400px] mx-auto p-4 md:p-8 gap-8 items-start">
        {/* Sidebar */}
        <div className="w-full md:w-[220px] shrink-0 flex flex-col gap-2">
          <SidebarItem icon={<Users size={18} />} label="Gerenciar ADMs" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />
          <SidebarItem icon={<Key size={18} />} label="Resetar Senhas" active={activeTab === 'passwords'} onClick={() => setActiveTab('passwords')} />
          <SidebarItem icon={<Trash2 size={18} />} label="Zona de Perigo" active={activeTab === 'danger'} onClick={() => setActiveTab('danger')} />
          <SidebarItem icon={<Activity size={18} />} label="Estatísticas" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        </div>

        {/* Content */}
        <div className="flex-1 w-full bg-[#111] border border-[#222] rounded-xl p-6 min-h-[500px]">
          {activeTab === 'admins' && <AdminsTab fetcher={masterFetch} showToast={showToast} />}
          {activeTab === 'passwords' && <PasswordsTab fetcher={masterFetch} showToast={showToast} />}
          {activeTab === 'danger' && <DangerTab fetcher={masterFetch} showToast={showToast} />}
          {activeTab === 'stats' && <StatsTab fetcher={masterFetch} />}
        </div>
      </div>
    </div>
  );
};

// ---------------- TAB COMPONENTS ----------------

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-r-lg font-bold transition-all text-sm w-full text-left
      ${active ? 'bg-[#1a0d00] border-l-[3px] border-accent text-accent' : 'text-text-secondary hover:bg-[#161616] hover:text-text-primary border-l-[3px] border-transparent'}
    `}
  >
    {icon} {label}
  </button>
);

const AdminsTab = ({ fetcher, showToast }: any) => {
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [fetching, setFetching] = useState(true);

  const loadAdmins = async () => {
    setFetching(true);
    try {
      const res = await fetcher('/api/master/admins');
      if (res.ok) setAdmins(await res.json());
    } catch {}
    setFetching(false);
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return showToast('Senhas não coincidem!');
    setLoading(true);
    try {
      const res = await fetcher('/api/master/create-admin', {
        method: 'POST',
        body: JSON.stringify({ nick, password, role: 'ADMIN' })
      });
      if (res.ok) {
        showToast(`ADM ${nick} criado com sucesso ✓`);
        setNick(''); setPassword(''); setConfirm('');
        loadAdmins();
      } else {
        showToast('Erro ao criar ADM');
      }
    } catch {
       showToast('Erro de conexão');
    }
    setLoading(false);
  };

  const handleRemove = async (id: string, admnick: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o ADM ${admnick}?`)) return;
    try {
      const res = await fetcher(`/api/master/admins/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`ADM ${admnick} removido ✓`);
        loadAdmins();
      }
    } catch {}
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-display text-text-primary mb-4 border-l-4 border-accent pl-3">Criar Novo ADM</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl bg-[#161616] p-6 rounded-lg border border-[#222]">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Nick</label>
            <input type="text" value={nick} onChange={e => setNick(e.target.value)} required className="w-full bg-[#111] border border-[#333] rounded p-3 text-text-primary focus:border-accent outline-none" placeholder="Ex: ze_droguinha" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-[#111] border border-[#333] rounded p-3 text-text-primary focus:border-accent outline-none" minLength={6} placeholder="******" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Confirmar Senha</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full bg-[#111] border border-[#333] rounded p-3 text-text-primary focus:border-accent outline-none" minLength={6} placeholder="******" />
          </div>
          <button type="submit" disabled={loading} className="sm:col-span-2 mt-2 bg-accent text-bg-primary font-bold py-3 rounded hover:opacity-90 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'CRIAR ADM'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-display text-text-primary mb-4 border-l-4 border-accent pl-3">Lista de ADMs</h2>
        {fetching ? <p className="text-[#666]">Carregando...</p> : (
          <div className="bg-[#161616] rounded-lg border border-[#222] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111] border-b border-[#222]">
                <tr>
                  <th className="p-4 text-text-secondary font-bold uppercase tracking-wider text-xs">Nick</th>
                  <th className="p-4 text-text-secondary font-bold uppercase tracking-wider text-xs">Criado em</th>
                  <th className="p-4 text-text-secondary font-bold uppercase tracking-wider text-xs text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-[#1a1a1a]">
                    <td className="p-4 font-bold text-text-primary">{a.nick}</td>
                    <td className="p-4 text-text-muted">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleRemove(a.id, a.nick)} className="text-danger hover:underline font-bold text-xs bg-danger/10 px-3 py-1.5 rounded">Remover</button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={3} className="p-6 text-center text-text-muted">Nenhum ADM encontrado além dos masters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const PasswordsTab = ({ fetcher, showToast }: any) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    try {
      const res = await fetcher(`/api/master/users?nick=${search}`);
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPass !== confirmPass) return showToast('Senhas não coincidem!');
    try {
      const res = await fetcher(`/api/master/users/${selectedUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPass })
      });
      if (res.ok) {
        showToast(`Senha de ${selectedUser.nick} atualizada ✓`);
        setSelectedUser(null); setNewPass(''); setConfirmPass('');
      } else {
        showToast('Erro ao atualizar senha');
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-text-primary mb-4 border-l-4 border-accent pl-3">Resetar Senhas</h2>
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nick..." className="flex-1 bg-[#161616] border border-[#333] rounded p-3 text-text-primary focus:border-accent outline-none" />
        <button type="submit" className="bg-[#222] border border-[#333] hover:border-accent text-text-primary px-6 rounded font-bold transition-all">Buscar</button>
      </form>

      {users.length > 0 && (
        <div className="grid gap-2 max-w-2xl">
          {users.map(u => (
            <div key={u.id} className="bg-[#161616] border border-[#222] p-4 rounded flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">{u.nick}</div>
                <div className="text-xs text-text-muted mt-1">Role: {u.role} • Criado: {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setSelectedUser(u)} className="bg-accent/10 text-accent font-bold px-4 py-2 rounded text-sm hover:bg-accent hover:text-bg-primary transition-colors">
                Resetar Senha
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleReset} className="bg-[#111] border border-[#333] p-6 rounded-xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Resetar: <span className="text-accent">{selectedUser.nick}</span></h3>
            <div className="space-y-3 mb-6">
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="Nova senha" minLength={6} className="w-full bg-[#161616] border border-[#333] rounded p-3 text-white outline-none focus:border-accent" />
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required placeholder="Confirmar senha" minLength={6} className="w-full bg-[#161616] border border-[#333] rounded p-3 text-white outline-none focus:border-accent" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 border border-[#333] py-3 rounded text-[#888] font-bold hover:bg-[#222]">Cancelar</button>
              <button type="submit" className="flex-1 bg-accent font-bold py-3 rounded text-black hover:opacity-90">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const DangerTab = ({ fetcher, showToast }: any) => {
  const handleResetWeekly = async () => {
    const input = window.prompt('Digite CONFIRMAR para zerar o ranking semanal:');
    if (input === 'CONFIRMAR') {
      try {
        const res = await fetcher('/api/master/reset-weekly', { method: 'POST' });
        if (res.ok) showToast('Pontos semanais zerados ✓');
      } catch {}
    }
  };

  const handleDeleteAll = async () => {
    const input = window.prompt('ATENÇÃO: Digite DELETAR TUDO para remover todos os players:');
    if (input === 'DELETAR TUDO') {
      try {
        const res = await fetcher('/api/master/players', { method: 'DELETE' });
        if (res.ok) showToast('Todos os players removidos ✓');
      } catch {}
    }
  };

  return (
    <div className="max-w-xl">
      <div className="bg-danger/5 border border-danger/20 rounded-xl p-6 relative overflow-hidden">
        <h2 className="text-2xl font-display text-danger mb-6 flex items-center gap-2">⚠️ ZONA DE PERIGO</h2>
        
        <div className="space-y-6">
          <div className="pb-6 border-b border-danger/10">
            <div className="font-bold mb-1">Zerar Ranking Semanal</div>
            <p className="text-sm text-text-muted mb-4">Isso define weekly_points = 0 para todos os usuários.</p>
            <button onClick={handleResetWeekly} className="border border-danger text-danger hover:bg-danger hover:text-white px-6 py-2.5 rounded font-bold transition-all text-sm uppercase tracking-wider">
              Zerar Semana
            </button>
          </div>
          
          <div>
            <div className="font-bold mb-1 text-danger">Remover TODOS os Players</div>
            <p className="text-sm text-text-muted mb-4">Deleta todos os usuários onde role = 'PLAYER'. NÃO AFETA ADMS. Irreversível.</p>
            <button onClick={handleDeleteAll} className="bg-danger text-white hover:bg-danger/80 px-6 py-2.5 rounded font-bold transition-all text-sm uppercase tracking-wider">
              Deletar Todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsTab = ({ fetcher }: any) => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetcher('/api/master/stats');
        if (res.ok) setStats(await res.json());
      } catch {}
    };
    load();
  }, []);

  if (!stats) return <div className="p-6 text-[#666]">Buscando estatísticas...</div>;

  const cards = [
    { label: 'Total Players', value: stats.totalPlayers },
    { label: 'Total Admins', value: stats.totalAdmins },
    { label: 'Booyahs Pendentes', value: stats.pendingSubmissions, color: 'text-warning' },
    { label: 'Total Pontos p/ Semana', value: stats.weeklyPoints, color: 'text-accent' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-display text-text-primary mb-6 border-l-4 border-accent pl-3">Estatísticas Gerais</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-[#161616] border border-[#222] rounded-lg p-6">
            <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#666] mb-2">{c.label}</div>
            <div className={`text-[40px] font-display leading-none ${c.color || 'text-white'}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
