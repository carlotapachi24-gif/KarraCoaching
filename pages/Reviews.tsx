import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ArrowRight, Clock, AlertTriangle, X, MessageSquare, Send, Image } from 'lucide-react';

interface ReviewItemData {
  id: string;
  clientEmail: string;
  clientName: string;
  submittedAt: string;
  status: 'pending' | 'completed';
  weightKg: number;
  energy: number;
  sleep: number;
  stress: number;
  adherence: number;
  comments: string;
  feedback: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = window.location.hostname.endsWith('github.io') ? (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '') : '';
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

export const Reviews: React.FC = () => {
  const [selectedReview, setSelectedReview] = useState<ReviewItemData | null>(null);
  const [feedback, setFeedback] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed'>('pending');
  const [reviews, setReviews] = useState<ReviewItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/reviews'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('No se pudieron cargar las revisiones');
      }
      const data = (await response.json()) as { reviews: ReviewItemData[] };
      setReviews(data.reviews);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando revisiones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    if (filterType === 'all') return reviews;
    return reviews.filter((review) => review.status === filterType);
  }, [filterType, reviews]);

  const pendingCount = reviews.filter((review) => review.status === 'pending').length;
  const completedCount = reviews.filter((review) => review.status === 'completed').length;

  const handleSendFeedback = async () => {
    if (!selectedReview || !feedback.trim()) return;

    try {
      const response = await fetch(apiUrl(`/api/reviews/${selectedReview.id}/feedback`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar feedback');
      }

      await loadReviews();
      setSelectedReview(null);
      setFeedback('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error enviando feedback');
    }
  };

  const openReview = (review: ReviewItemData) => {
    setSelectedReview(review);
    setFeedback(review.feedback || '');
  };

  const formatRelative = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/2 bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setSelectedReview(null)} className="md:hidden p-2 bg-white rounded-full shadow-sm"><X size={20} /></button>
                <h3 className="font-display font-black text-xl text-text uppercase italic">Check-in de {selectedReview.clientName}</h3>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                <MetricRow label="Peso" value={`${selectedReview.weightKg} kg`} />
                <MetricRow label="Energia" value={`${selectedReview.energy}/10`} />
                <MetricRow label="Sueno" value={`${selectedReview.sleep}/10`} />
                <MetricRow label="Estres" value={`${selectedReview.stress}/10`} />
                <MetricRow label="Adherencia" value={`${selectedReview.adherence}/10`} />
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Comentarios</p>
                  <p className="text-sm text-slate-700 font-medium">{selectedReview.comments || 'Sin comentarios'}</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-6 flex flex-col h-full bg-white relative">
              <button onClick={() => setSelectedReview(null)} className="absolute top-4 right-4 text-slate-400 hover:text-text hidden md:block"><X size={24} /></button>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase"><MessageSquare className="text-primary" size={20} /> Feedback del Coach</h3>

              <div className="flex-1 mb-4">
                <textarea
                  className="w-full h-full min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed font-medium"
                  placeholder={`Escribe tu respuesta para ${selectedReview.clientName} aqui...`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-slate-400 flex items-center gap-1 text-xs font-bold uppercase">
                  <Image size={16} /> Recursos en biblioteca
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedReview(null)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors uppercase">Cancelar</button>
                  <button onClick={handleSendFeedback} className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-2 uppercase tracking-wide">
                    <Send size={16} /> Enviar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Revisiones Semanales</h1>
        <p className="text-slate-500 mt-1 font-medium">Gestiona check-ins y feedback de clientes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="Pendientes" value={String(pendingCount)} color="red" onClick={() => setFilterType('pending')} active={filterType === 'pending'} />
        <SummaryCard title="Completadas" value={String(completedCount)} color="green" onClick={() => setFilterType('completed')} active={filterType === 'completed'} />
        <SummaryCard title="Total" value={String(reviews.length)} color="slate" onClick={() => setFilterType('all')} active={filterType === 'all'} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-text uppercase tracking-tight">Cola de Revisiones</h3>
          {filterType !== 'all' && <button onClick={() => setFilterType('all')} className="text-xs font-bold text-slate-400 hover:text-primary uppercase">Ver Todo</button>}
        </div>

        {error && <p className="p-4 text-sm text-red-600 font-bold">{error}</p>}
        {isLoading && <p className="p-6 text-sm text-slate-400 font-bold">Cargando revisiones...</p>}

        {!isLoading && filteredReviews.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No hay revisiones para este filtro.</div>}

        <div className="divide-y divide-slate-100">
          {filteredReviews.map((review) => (
            <div key={review.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-center gap-6 group cursor-pointer" onClick={() => openReview(review)}>
              <div className="flex items-center gap-4 flex-1 w-full">
                <img src={`https://picsum.photos/seed/${encodeURIComponent(review.clientEmail)}/100`} alt={review.clientName} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-text text-base uppercase">{review.clientName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{review.clientEmail}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatRelative(review.submittedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Peso</p>
                  <span className="text-sm font-bold text-text">{review.weightKg} kg</span>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado</p>
                  <span className={`text-sm font-bold ${review.status === 'completed' ? 'text-secondary' : 'text-primary'}`}>{review.status === 'completed' ? 'Completada' : 'Pendiente'}</span>
                </div>

                <button onClick={(e) => { e.stopPropagation(); openReview(review); }} className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-2 uppercase tracking-wide">
                  Revisar <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, color, onClick, active }: any) => {
  const base = color === 'red' ? 'bg-red-50 border-red-100 text-primary' : color === 'green' ? 'bg-green-50 border-green-100 text-secondary' : 'bg-slate-50 border-slate-100 text-slate-700';
  return (
    <div onClick={onClick} className={`p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${base} ${active ? 'ring-2 ring-offset-2 ring-primary/30' : ''}`}>
      <p className="font-bold uppercase tracking-wide">{title}</p>
      <p className="text-4xl font-display font-black text-text italic">{value}</p>
    </div>
  );
};

const MetricRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
    <span className="text-sm font-bold text-slate-500 uppercase">{label}</span>
    <span className="font-display font-black text-lg text-text">{value}</span>
  </div>
);

