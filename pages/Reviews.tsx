import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Clock, AlertTriangle, ChevronRight, BarChart, X, MessageSquare, Send, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Reviews: React.FC = () => {
  const navigate = useNavigate();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'urgent' | 'completed'>('all');

  const reviews = [
    { id: 1, name: "Alex Rivera", plan: "Hipertrofia Pro", time: "Hace 2 horas", weightChange: "-0.5 kg", adherence: "100%", img: "https://picsum.photos/seed/alex/100", isUrgent: false, lastWeight: 83.5, currentWeight: 83.0, waist: 82, energy: 8, status: 'pending' },
    { id: 2, name: "Juan Pérez", plan: "Fuerza 5x5", time: "Hace 5 horas", weightChange: "+0.2 kg", adherence: "80%", img: "https://picsum.photos/seed/juan/100", isUrgent: true, lastWeight: 90.0, currentWeight: 90.2, waist: 95, energy: 6, status: 'urgent' },
    { id: 3, name: "Laura Torres", plan: "Recomposición", time: "Ayer", weightChange: "-1.1 kg", adherence: "95%", img: "https://picsum.photos/seed/laura/100", isUrgent: false, lastWeight: 59.1, currentWeight: 58.0, waist: 65, energy: 9, status: 'completed' },
  ];

  const filteredReviews = reviews.filter(r => {
     if (filterType === 'all') return true;
     if (filterType === 'urgent') return r.isUrgent;
     if (filterType === 'pending') return !r.isUrgent && r.status !== 'completed'; // Simplifying logic for demo
     if (filterType === 'completed') return r.status === 'completed';
     return true;
  });

  const handleSendFeedback = () => {
    alert(`Feedback enviado a ${selectedReview.name} correctamente.`);
    setSelectedReview(null);
    setFeedback('');
  };

  const handleAttachResource = () => {
    alert("Función para adjuntar PDF/Video: Abriría el selector de archivos del sistema.");
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Col: Photos & Metrics */}
            <div className="w-full md:w-1/2 bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setSelectedReview(null)} className="md:hidden p-2 bg-white rounded-full shadow-sm"><X size={20}/></button>
                <h3 className="font-display font-black text-xl text-text uppercase italic">Check-in de {selectedReview.name}</h3>
              </div>

              {/* Fake Photos Grid */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="aspect-[3/4] bg-slate-200 rounded-lg relative overflow-hidden group">
                  <img src={`https://picsum.photos/seed/${selectedReview.id}f/300/400`} className="w-full h-full object-cover" alt="Front" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-black bg-primary text-white px-2 py-1 rounded skew-x-[-10deg] uppercase">FRENTE</span>
                </div>
                <div className="aspect-[3/4] bg-slate-200 rounded-lg relative overflow-hidden group">
                   <img src={`https://picsum.photos/seed/${selectedReview.id}p/300/400`} className="w-full h-full object-cover" alt="Profile" />
                   <span className="absolute bottom-2 left-2 text-[10px] font-black bg-primary text-white px-2 py-1 rounded skew-x-[-10deg] uppercase">PERFIL</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-sm font-bold text-slate-500 uppercase">Peso Corporal</span>
                  <div className="text-right">
                    <span className="block font-display font-black text-lg text-text">{selectedReview.currentWeight} kg</span>
                    <span className={`text-xs font-bold ${selectedReview.weightChange.includes('-') ? 'text-secondary' : 'text-accent'}`}>
                      {selectedReview.weightChange} vs semana anterior
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-sm font-bold text-slate-500 uppercase">Cintura</span>
                  <span className="font-display font-black text-lg text-text">{selectedReview.waist} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500 uppercase">Energía (1-10)</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`w-2 h-4 rounded-sm skew-x-[-10deg] ${i < selectedReview.energy ? 'bg-primary' : 'bg-slate-200'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Feedback Form */}
            <div className="w-full md:w-1/2 p-6 flex flex-col h-full bg-white relative">
              <button onClick={() => setSelectedReview(null)} className="absolute top-4 right-4 text-slate-400 hover:text-text hidden md:block"><X size={24}/></button>
              
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase">
                <MessageSquare className="text-primary" size={20} /> Feedback del Coach
              </h3>

              <div className="flex-1 mb-4">
                <textarea 
                  className="w-full h-full min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed font-medium"
                  placeholder={`Escribe tu respuesta para ${selectedReview.name} aquí...\n\nEj: "Buenas fotos, veo una mejora clara en la definición abdominal. Vamos a mantener las calorías una semana más..."`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button 
                  onClick={handleAttachResource}
                  className="text-slate-400 hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                >
                  <Image size={16} /> Adjuntar recurso
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedReview(null)}
                    className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors uppercase"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSendFeedback}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-2 uppercase tracking-wide"
                  >
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
        <p className="text-slate-500 mt-1 font-medium">Gestiona los check-ins y feedback de clientes.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setFilterType('pending')}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${filterType === 'pending' ? 'bg-red-100 border-red-200 ring-2 ring-red-200 ring-offset-2' : 'bg-red-50 border-red-100'}`}
        >
           <div className="flex items-center gap-3 mb-2">
             <Clock className="text-primary" size={24} />
             <h3 className="font-bold text-primary uppercase tracking-wide">Pendientes</h3>
           </div>
           <p className="text-4xl font-display font-black text-text italic">12</p>
           <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Requieren feedback</p>
        </div>
        <div 
          onClick={() => setFilterType('urgent')}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${filterType === 'urgent' ? 'bg-orange-100 border-orange-200 ring-2 ring-orange-200 ring-offset-2' : 'bg-orange-50 border-orange-100'}`}
        >
           <div className="flex items-center gap-3 mb-2">
             <AlertTriangle className="text-accent" size={24} />
             <h3 className="font-bold text-accent uppercase tracking-wide">Retrasados</h3>
           </div>
           <p className="text-4xl font-display font-black text-text italic">5</p>
           <p className="text-xs text-slate-500 font-bold mt-1 uppercase">+24h sin check-in</p>
        </div>
        <div 
          onClick={() => setFilterType('completed')}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${filterType === 'completed' ? 'bg-green-100 border-green-200 ring-2 ring-green-200 ring-offset-2' : 'bg-green-50 border-green-100'}`}
        >
           <div className="flex items-center gap-3 mb-2">
             <CheckCircle2 className="text-secondary" size={24} />
             <h3 className="font-bold text-secondary uppercase tracking-wide">Completados</h3>
           </div>
           <p className="text-4xl font-display font-black text-text italic">34</p>
           <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Esta semana</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-text uppercase tracking-tight">Cola de Revisiones</h3>
          {filterType !== 'all' && (
             <button onClick={() => setFilterType('all')} className="text-xs font-bold text-slate-400 hover:text-primary uppercase">
               Ver Todo
             </button>
          )}
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <ReviewItem 
                key={review.id}
                {...review}
                onReview={() => setSelectedReview(review)}
              />
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium">
               No hay revisiones para este filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewItem = ({ name, plan, time, weightChange, adherence, img, isUrgent, onReview }: any) => (
  <div className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-center gap-6 group cursor-pointer" onClick={onReview}>
    <div className="flex items-center gap-4 flex-1 w-full">
      <div className="relative">
        <img src={img} alt={name} className="w-12 h-12 rounded-full object-cover" />
        {isUrgent && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
            !
          </div>
        )}
      </div>
      <div>
        <h4 className="font-bold text-text text-base uppercase">{name}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>{plan}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
      <div className="text-center md:text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Peso</p>
        <span className={`text-sm font-bold ${weightChange.startsWith('-') ? 'text-secondary' : 'text-accent'}`}>{weightChange}</span>
      </div>
      <div className="text-center md:text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cumplimiento</p>
        <span className="text-sm font-bold text-text">{adherence}</span>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onReview(); }}
        className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-2 uppercase tracking-wide"
      >
        Revisar <ArrowRight size={16} />
      </button>
    </div>
  </div>
);