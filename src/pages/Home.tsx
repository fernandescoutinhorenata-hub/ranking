import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Medal, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserRank {
  id: string;
  nick: string;
  weeklyPoints: number;
}

export const Home: React.FC = () => {
  const [ranking, setRanking] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchRanking = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, nick, weekly_points')
      .eq('status', 'ATIVO')
      .eq('role', 'PLAYER')
      .order('weekly_points', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRanking(data.map(u => ({ id: u.id, nick: u.nick, weeklyPoints: u.weekly_points })));
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 5 * 60 * 1000); // refresh a cada 5 min
    return () => clearInterval(interval);
  }, []);

  const maxPoints = ranking.length > 0 ? Math.max(...ranking.map(u => u.weeklyPoints), 1) : 1;

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-text-primary mb-2">Ranking de Booyahs</h1>
          <p className="text-text-secondary">Os melhores jogadores da comunidade.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRanking}
            disabled={loading}
            className="text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
            title="Atualizar agora"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="bg-accent-dim text-accent px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 border border-accent/20">
            <RefreshCw size={14} />
            Atualiza a cada 5 min
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-bg-card p-1 rounded-lg w-fit border border-border">
        <button className="px-6 py-2 rounded-md font-bold transition-all bg-accent text-bg-primary">
          Semanal
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
        {loading && ranking.length === 0 ? (
          <div className="flex items-center justify-center p-16 text-text-secondary gap-3">
            <Loader2 size={24} className="animate-spin text-accent" />
            Carregando ranking...
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center p-16 text-text-secondary">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-lg">Nenhum jogador cadastrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {ranking.map((user, index) => {
                const points = user.weeklyPoints;
                const percentage = Math.max((points / maxPoints) * 100, 5);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={user.id} 
                    className={`p-4 flex items-center gap-4 transition-colors relative overflow-hidden group bg-row-bg ${index === 0 ? 'bg-accent/5' : ''}`}
                  >
                    <div className="relative z-10 w-8 text-center font-display font-bold text-xl text-text-muted shrink-0">
                      {index === 0 ? <Trophy className="text-warning mx-auto" size={24} /> : 
                       index === 1 ? <Medal className="text-text-muted mx-auto" size={24} /> : 
                       index === 2 ? <Medal className="text-warning mx-auto" size={24} /> : 
                       `#${index + 1}`}
                    </div>

                    <div className="relative z-10 w-12 h-12 rounded-full border-2 border-border group-hover:border-accent transition-colors bg-bg-secondary flex items-center justify-center text-text-secondary font-bold text-lg shrink-0">
                      {getInitials(user.nick)}
                    </div>

                    <div className="relative z-10 w-32 sm:w-48 shrink-0">
                      <h3 className="text-lg font-bold text-text-primary truncate">{user.nick}</h3>
                    </div>

                    {/* THIN PROGRESS BAR COLUMN */}
                    <div className="relative z-10 flex-1 flex items-center px-4 hidden sm:flex">
                      <div className="w-full h-[5px] rounded-[3px] bg-bar-track overflow-hidden relative">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-bar-fill transition-all duration-1000 ease-out rounded-[3px]"
                          style={{ 
                            width: `${percentage}%`,
                            opacity: index === 0 ? 1 : 
                                     index === 1 ? 0.85 :
                                     index === 2 ? 0.70 :
                                     index === 3 ? 0.55 :
                                     Math.max(0.1, 0.45 - ((index - 4) * 0.1))
                          }}
                        />
                      </div>
                    </div>

                    {/* THIN PROGRESS BAR MOBILE */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-bar-track sm:hidden overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-bar-fill transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${percentage}%`,
                          opacity: index === 0 ? 1 : Math.max(0.1, 0.45 - ((index - 4) * 0.1))
                        }}
                      />
                    </div>

                    <div className="relative z-10 text-right shrink-0 ml-auto sm:ml-0">
                      <div className="text-2xl font-display font-bold text-accent">{points}</div>
                      <div className="text-xs text-text-secondary uppercase tracking-wider">Pontos</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
