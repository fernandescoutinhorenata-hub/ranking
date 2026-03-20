import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Clock, CheckCircle, XCircle, UploadCloud, PieChart, Activity, Image as ImageIcon, Flame, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface Submission {
  id: string;
  image_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

interface UserStats {
  weekly_points: number;
  total_points: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<UserStats>({ weekly_points: 0, total_points: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingData(true);
      // busca o id e stats do usuario
      const { data: userData } = await supabase
        .from('users')
        .select('id, weekly_points, total_points')
        .eq('nick', user.nick)
        .single();

      if (userData) {
        setUserId(userData.id);
        setStats({ weekly_points: userData.weekly_points, total_points: userData.total_points });

        // busca submissions do usuario
        const { data: subs } = await supabase
          .from('submissions')
          .select('id, image_url, status, created_at')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (subs) setSubmissions(subs);
      }
      setLoadingData(false);
    };
    load();
  }, [user]);

  const onDrop = useCallback((acceptedFiles: any) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false
  } as any);

  const handleSubmit = async () => {
    if (!file || !userId) return;
    setUploading(true);

    try {
      // 1. Upload da imagem para o Storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('booyahs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Pega URL pública
      const { data: urlData } = supabase.storage.from('booyahs').getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      // 3. getCurrentWeekNumber
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);

      // 4. Insere submission no banco
      const { data: newSub, error: insertError } = await supabase
        .from('submissions')
        .insert({ user_id: userId, image_url: imageUrl, week_number: weekNumber })
        .select()
        .single();

      if (insertError) throw insertError;

      setSubmissions(prev => [newSub, ...prev]);
      setFile(null);
      setPreview(null);
      showToast('Print enviada! Aguardando revisão 🔥');
    } catch (err) {
      showToast('Erro ao enviar a print. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  if (!user || user.role !== 'PLAYER') {
    return <Navigate to="/login" replace />;
  }

  const totalSubs = submissions.length;
  const approved = submissions.filter(s => s.status === 'APPROVED').length;
  const approvalRate = totalSubs > 0 ? Math.round((approved / totalSubs) * 100) : 0;

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora mesmo';
    if (mins < 60) return `há ${mins} minutos`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs} hora${hrs > 1 ? 's' : ''}`;
    return `há ${Math.floor(hrs / 24)} dia(s)`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 relative">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 px-6 py-3 rounded-lg font-bold shadow-lg shadow-accent/30 flex items-center gap-2 bg-accent text-bg-primary"
          >
            <Flame size={18} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Painel do Jogador</h1>
        <p className="text-text-secondary">Bem-vindo(a) de volta, <strong className="text-text-primary">{user.nick}</strong>!</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-bg-card border border-border rounded-xl p-6 hover:border-accent transition-colors group">
          <div className="flex gap-2 items-center text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">
            <Activity size={16} className="group-hover:text-accent transition-colors" /> Pontos Semana
          </div>
          <div className="text-4xl font-display font-bold text-accent">
            {loadingData ? <Loader2 size={28} className="animate-spin" /> : <>{stats.weekly_points} <span className="text-lg text-text-muted">pts</span></>}
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-6 hover:border-border transition-colors group">
          <div className="flex gap-2 items-center text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">
            <TrophyIcon /> Total de pontos
          </div>
          <div className="text-4xl font-display font-bold text-text-primary">
            {loadingData ? <Loader2 size={28} className="animate-spin" /> : <>{stats.total_points} <span className="text-lg text-text-muted">pts</span></>}
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex gap-2 items-center text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">
            <ImageIcon size={16} /> Prints enviadas
          </div>
          <div className="text-4xl font-display font-bold text-text-primary">
            {loadingData ? <Loader2 size={28} className="animate-spin" /> : totalSubs}
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex gap-2 items-center text-text-secondary text-sm font-bold uppercase tracking-wider mb-2">
            <PieChart size={16} /> Taxa de aprovação
          </div>
          <div className="text-4xl font-display font-bold text-warning">
            {loadingData ? <Loader2 size={28} className="animate-spin" /> : `${approvalRate}%`}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        <section>
          <h2 className="text-2xl font-display font-bold text-text-primary mb-4 flex items-center gap-2">
            <UploadCloud className="text-accent" /> Enviar Booyah
          </h2>
          <div className="bg-bg-card border border-border rounded-xl p-6">
            {!preview ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-border hover:border-accent/50 hover:bg-bg-secondary'}`}
              >
                <input {...getInputProps()} />
                <div className="bg-bg-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                   <UploadCloud className="text-text-secondary" size={28} />
                </div>
                <p className="text-text-primary font-medium mb-2 text-lg">Arraste sua print aqui ou clique</p>
                <p className="text-sm text-text-secondary">Apenas PNG/JPG até 5MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-primary border border-border">
                  <img src={preview} alt="Preview" loading="lazy" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-danger text-text-primary p-2 rounded-full transition-colors backdrop-blur-md"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
                <button 
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full bg-accent text-bg-primary font-bold text-lg py-4 rounded-md hover:bg-opacity-90 transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {uploading ? <><Loader2 size={20} className="animate-spin" /> Enviando...</> : <><UploadCloud size={20} /> Enviar para Revisão</>}
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-display font-bold text-text-primary mb-4 flex items-center gap-2">
            <Clock className="text-text-secondary" /> Meus Envios Recentes
          </h2>
          <div className="space-y-3">
            {loadingData ? (
              <div className="flex justify-center py-12 text-text-secondary gap-2">
                <Loader2 size={20} className="animate-spin text-accent" /> Carregando...
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
                <UploadCloud size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhum envio ainda. Envie seu primeiro Booyah!</p>
              </div>
            ) : (
              submissions.map((sub, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={sub.id} 
                  className="bg-bg-card border border-border rounded-xl p-3 flex gap-4 items-center hover:bg-bg-secondary transition-colors"
                >
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden bg-bg-primary shrink-0 border border-border">
                    <img src={sub.image_url} alt="Booyah" loading="lazy" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-bold truncate text-sm lg:text-base">
                      {sub.image_url.split('/').pop() || 'booyah'}
                    </h3>
                    <div className="text-xs text-text-secondary mb-2">{formatDate(sub.created_at)}</div>
                    <div className="flex items-center gap-2">
                      {sub.status === 'PENDING' && (
                        <span className="bg-warning/10 text-warning px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-warning/20">
                          <Clock size={12} /> Aguardando
                        </span>
                      )}
                      {sub.status === 'APPROVED' && (
                        <span className="bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-accent/20">
                          <CheckCircle size={12} /> Aprovado (+1)
                        </span>
                      )}
                      {sub.status === 'REJECTED' && (
                        <span className="bg-danger/10 text-danger px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-danger/20">
                          <XCircle size={12} /> Recusado
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
        
      </div>
    </div>
  );
};

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
