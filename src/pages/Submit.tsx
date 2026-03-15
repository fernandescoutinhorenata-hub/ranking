import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../components/AuthContext';
import { UploadCloud, CheckCircle, XCircle, Clock, ImageIcon, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface Submission {
  id: string;
  imageUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const Submit: React.FC = () => {
  const { user, token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/submissions/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const onDrop = useCallback((acceptedFiles: any) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false
  } as any);

  const handleSubmit = async () => {
    if (!file || !token) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setFile(null);
        setPreview(null);
        fetchSubmissions();
      } else {
        setError(data.error || 'Erro ao enviar imagem');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-text-primary">Por favor, faça login para enviar prints.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 grid md:grid-cols-2 gap-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-6">Enviar Booyah</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">Seu Nick no Discord</label>
          <input 
            type="text" 
            value={user.discordName} 
            disabled 
            className="w-full bg-bg-secondary border border-border rounded-md p-3 text-text-primary opacity-70 cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-md text-danger flex items-center gap-2">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {!preview ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-text-secondary hover:bg-bg-secondary'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto text-text-secondary mb-4" size={48} />
            <p className="text-text-primary font-medium mb-2">Arraste sua print aqui ou clique para selecionar</p>
            <p className="text-sm text-text-secondary">PNG, JPG até 5MB</p>
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-bg-primary">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              <button 
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-text-primary p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full bg-accent text-bg-primary font-bold py-3 rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <RefreshCw className="animate-spin" size={20} /> : <UploadCloud size={20} />}
              {uploading ? 'Enviando...' : 'Enviar para Revisão'}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-6">Meus Envios Recentes</h2>
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-text-secondary bg-bg-card p-6 rounded-xl border border-border text-center">
              Você ainda não enviou nenhuma print.
            </div>
          ) : (
            submissions.map((sub) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={sub.id} 
                className="bg-bg-card border border-border rounded-xl p-4 flex gap-4 items-center"
              >
                <div className="w-20 h-20 rounded-md overflow-hidden bg-bg-primary shrink-0 border border-border">
                  <img src={sub.imageUrl} alt="Booyah" className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-text-secondary mb-2">
                    {new Date(sub.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.status === 'PENDING' && (
                      <span className="bg-warning/20 text-warning px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-warning/20">
                        <Clock size={12} /> Aguardando
                      </span>
                    )}
                    {sub.status === 'APPROVED' && (
                      <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-accent/20">
                        <CheckCircle size={12} /> Aprovado (+1)
                      </span>
                    )}
                    {sub.status === 'REJECTED' && (
                      <span className="bg-danger/20 text-danger px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-danger/20">
                        <XCircle size={12} /> Recusado
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
