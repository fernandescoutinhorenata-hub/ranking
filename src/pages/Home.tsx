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
      <div className="flex flex-col sm:flex-row items-end justify-between mb-8 gap-4 border-b-2 border-accent pb-6">
        <div>
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
            SEMANA ATUAL
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-text-primary tracking-wide leading-none mb-1">RANKING SEMANAL</h1>
          <p className="text-text-secondary text-lg">Comunidade Free Fire — semana atual</p>
        </div>
        
        <div className="flex flex-col sm:items-end gap-3">
          <div className="bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-accent/20">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Auto-refresh (5m)
          </div>
          <button
            onClick={fetchRanking}
            disabled={loading}
            className="text-text-secondary hover:text-accent transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
          >
            Atualizar agora
          </button>
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
                    className={`h-[72px] px-4 flex items-center gap-4 transition-colors relative overflow-hidden group ${index === 0 ? 'bg-[#1a0d00]' : 'bg-row-bg'}`}
                  >
                    <div className="relative z-10 w-8 text-center font-display font-bold text-xl text-[#555] shrink-0">
                      {index === 0 ? <Trophy className="text-[#FFD700] mx-auto" size={24} /> : 
                       index === 1 ? <Medal className="text-[#C0C0C0] mx-auto" size={24} /> : 
                       index === 2 ? <Medal className="text-[#CD7F32] mx-auto" size={24} /> : 
                       <span className="text-[14px]">#{index + 1}</span>}
                    </div>

                    <div className={`relative z-10 w-[44px] h-[44px] rounded-full border-[2px] transition-colors bg-bg-secondary flex items-center justify-center text-text-secondary font-bold text-lg shrink-0 ${index === 0 ? 'border-[#FFD700]' : index === 1 ? 'border-[#C0C0C0]' : index === 2 ? 'border-[#CD7F32]' : 'border-[#2a2a2a] group-hover:border-accent'}`}>
                      {getInitials(user.nick)}
                    </div>

                    <div className="relative z-10 w-32 sm:w-48 shrink-0">
                      <h3 className="text-[16px] font-[600] text-text-primary truncate">{user.nick}</h3>
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

                    <div className="relative z-10 text-right shrink-0 ml-auto sm:ml-0 flex flex-col justify-center">
                      <div className="text-[22px] font-display text-accent leading-none tracking-wide">{points}</div>
                      <div className="text-[11px] text-text-secondary tracking-widest leading-none mt-1">PONTOS</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="w-full border-t border-[#1a1a1a] my-10"></div>
      
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-[16px] p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 relative z-10 text-center md:text-left">
          <div className="bg-[#1a0d00] text-accent text-xs font-bold px-4 py-1.5 rounded-[20px] inline-flex items-center gap-2 mb-4 border border-accent/20 tracking-widest uppercase">
            🏆 Prêmio da Semana
          </div>
          <h2 className="text-[64px] font-display text-text-primary leading-none mb-1 tracking-wide">R$ 100</h2>
          <p className="text-xl font-bold text-text-primary mb-2 font-sans">para quem dar mais Booyah na semana</p>
          <p className="text-[#666] text-sm mb-6 max-w-sm mx-auto md:mx-0 font-sans leading-relaxed">
            O jogador com mais Booyahs aprovados até domingo à meia-noite leva tudo.
          </p>
          <a href="/login" className="inline-block bg-accent text-bg-primary font-bold px-8 py-3.5 rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-accent/20 whitespace-nowrap text-sm tracking-wide">
            Quero competir &rarr;
          </a>
        </div>

        <div className="w-full md:w-[280px] shrink-0 bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 relative z-10 flex flex-col items-center">
          <div className="text-[11px] font-bold text-[#666] uppercase tracking-widest mb-4 font-sans">Líder Atual</div>
          {ranking.length > 0 ? (
            <>
              <div className="relative w-[64px] h-[64px] rounded-full border-2 border-[#FFD700] bg-[#1a0d00] flex items-center justify-center text-accent font-bold text-2xl mb-3 shadow-[0_0_20px_rgba(255,215,0,0.15)]">
                {getInitials(ranking[0].nick)}
                <div className="absolute -bottom-2 -right-2 bg-[#FFD700] text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-[#161616]">
                  1
                </div>
              </div>
              <div className="font-bold text-lg text-text-primary mb-1 font-sans">{ranking[0].nick}</div>
              <div className="text-[32px] font-display text-accent leading-none tracking-wide mb-4">{ranking[0].weeklyPoints} <span className="text-sm text-[#666] font-sans tracking-normal">pts</span></div>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: '100%' }} />
              </div>
            </>
          ) : (
            <div className="py-6 flex flex-col items-center opacity-30">
              <Trophy size={48} className="text-accent mb-2" />
              <div className="text-[11px] font-bold uppercase tracking-widest font-sans">Aguardando...</div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 text-center">
        <p className="text-text-secondary mb-3">Faça parte do ranking</p>
        <a href="/login" className="inline-block bg-accent text-bg-primary font-bold px-8 py-3 rounded-md hover:bg-opacity-90 transition-all shadow-lg hover:shadow-accent/20">
          Entrar na comunidade
        </a>
      </div>
    </div>
  );
};
