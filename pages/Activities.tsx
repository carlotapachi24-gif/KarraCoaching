import React, { useState, useRef } from 'react';
import { 
  Heart, 
  Share2, 
  MapPin, 
  MoreHorizontal, 
  Footprints, 
  Dumbbell, 
  Bike,
  Plus,
  X,
  Image as ImageIcon,
  Clock,
  Upload
} from 'lucide-react';

type ActivityType = 'Run' | 'WeightTraining' | 'Ride';

interface Activity {
  id: number;
  user: string;
  avatar: string;
  date: string;
  title: string;
  description?: string;
  type: ActivityType;
  stats: {
    label: string;
    value: string;
    unit?: string;
  }[];
  visual?: string; // URL for map or photo
  kudos: number;
  hasKudos: boolean; // if current user liked it
}

const initialActivities: Activity[] = [
  {
    id: 1,
    user: 'Alex Rivera',
    avatar: 'https://picsum.photos/seed/alex/100',
    date: 'Hoy, 07:30 AM',
    title: 'Rodaje suave matutino',
    description: 'Probando las nuevas zapatillas. Ritmo comodo y pulsaciones bajas.',
    type: 'Run',
    stats: [
      { label: 'Distancia', value: '8.52', unit: 'km' },
      { label: 'Ritmo', value: '5:12', unit: '/km' },
      { label: 'Tiempo', value: '44:10' },
    ],
    visual: 'https://picsum.photos/seed/map1/600/300', // Mocking a map view
    kudos: 24,
    hasKudos: true,
  },
  {
    id: 2,
    user: 'Coach Yago',
    avatar: 'https://picsum.photos/seed/coach/100',
    date: 'Ayer, 18:45 PM',
    title: 'Pierna: Foco en Sentadilla',
    description: 'Buscando RPE 9 en la top set. La tecnica se sintio solida.',
    type: 'WeightTraining',
    stats: [
      { label: 'Volumen', value: '12.4', unit: 'ton' },
      { label: 'Tiempo', value: '1h 20m' },
      { label: 'PRs', value: '1' },
    ],
    visual: 'https://picsum.photos/seed/gym/600/400',
    kudos: 56,
    hasKudos: false,
  },
  {
    id: 3,
    user: 'Maria Garcia',
    avatar: 'https://picsum.photos/seed/maria/100',
    date: 'Ayer, 08:00 AM',
    title: 'Salida de Domingo en bici',
    type: 'Ride',
    stats: [
      { label: 'Distancia', value: '45.2', unit: 'km' },
      { label: 'Potencia', value: '180', unit: 'w' },
      { label: 'Tiempo', value: '2h 15m' },
    ],
    visual: 'https://picsum.photos/seed/bike/600/300',
    kudos: 18,
    hasKudos: false,
  }
];

export const Activities: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'community' | 'you'>('community');
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Activity Form State
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    duration: '',
    type: 'Run' as ActivityType,
    image: null as string | null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setNewActivity({ ...newActivity, image: url });
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Actividad',
          text: 'Mira esta actividad',
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore share cancellation/errors
    }
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate mock stats based on type
    let mockStats = [];
    if (newActivity.type === 'Run') {
      mockStats = [
        { label: 'Distancia', value: '5.0', unit: 'km' },
        { label: 'Ritmo', value: '5:30', unit: '/km' },
        { label: 'Tiempo', value: newActivity.duration || '30:00' },
      ];
    } else if (newActivity.type === 'Ride') {
      mockStats = [
        { label: 'Distancia', value: '20.0', unit: 'km' },
        { label: 'Potencia', value: '150', unit: 'w' },
        { label: 'Tiempo', value: newActivity.duration || '60:00' },
      ];
    } else {
       mockStats = [
        { label: 'Volumen', value: '8.5', unit: 'ton' },
        { label: 'Tiempo', value: newActivity.duration || '45:00' },
        { label: 'PRs', value: '0' },
      ];
    }

    const activity: Activity = {
      id: Date.now(),
      user: 'Alex Rivera',
      avatar: 'https://picsum.photos/seed/alex/100',
      date: 'Justo ahora',
      title: newActivity.title,
      description: newActivity.description,
      type: newActivity.type,
      stats: mockStats,
      visual: newActivity.image || undefined,
      kudos: 0,
      hasKudos: false
    };

    setActivities([activity, ...activities]);
    setIsModalOpen(false);
    setNewActivity({ title: '', description: '', duration: '', type: 'Run', image: null });
  };

  const filteredActivities = activeTab === 'community' 
    ? activities 
    : activities.filter(a => a.user === 'Alex Rivera');

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20 relative">
      
      {/* Create Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h2 className="font-display font-black text-xl uppercase italic tracking-tight">Nueva Actividad</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            
            <form onSubmit={handleCreateActivity} className="p-6 space-y-5">
              
              {/* Image Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden ${newActivity.image ? 'border-primary/50 bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                
                {newActivity.image ? (
                  <>
                    <img src={newActivity.image} alt="Preview" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-2">
                        <ImageIcon size={14} /> Cambiar Foto
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-primary mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon size={20} />
                    </div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-wide">Sube una foto</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Opcional</p>
                  </div>
                )}
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Titulo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Salida matutina" 
                    value={newActivity.title}
                    onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-text placeholder:font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
                  <select 
                    value={newActivity.type}
                    onChange={e => setNewActivity({...newActivity, type: e.target.value as ActivityType})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-text"
                  >
                    <option value="Run">Run</option>
                    <option value="WeightTraining">Pesas</option>
                    <option value="Ride">Bici</option>
                  </select>
                </div>
              </div>

              {/* Duration & Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duracion</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       placeholder="45:00" 
                       value={newActivity.duration}
                       onChange={e => setNewActivity({...newActivity, duration: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-9 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-text placeholder:font-medium"
                     />
                     <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   </div>
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripcion</label>
                   <textarea 
                     rows={1}
                     placeholder="Como te sentiste?" 
                     value={newActivity.description}
                     onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium text-text resize-none placeholder:font-medium"
                   />
                 </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={!newActivity.title}
                  className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase italic tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload size={20} /> Publicar Actividad
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
      {/* Feed Header & Tabs */}
      <header className="bg-white sticky top-[70px] md:top-0 z-30 pt-4 pb-0 px-4 -mx-4 md:mx-0 md:rounded-t-2xl border-b border-slate-100 shadow-sm md:shadow-none">
        <div className="flex justify-between items-center mb-4 px-2">
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tighter">Actividad</h1>
          <div className="flex gap-3">
             <button onClick={handleShare} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
               <Share2 size={20} />
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="p-2 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-95"
             >
               <Plus size={20} />
             </button>
          </div>
        </div>
        
        <div className="flex gap-8 px-2">
          <button 
            onClick={() => setActiveTab('community')}
            className={`pb-3 text-sm font-black uppercase tracking-wide border-b-2 transition-colors ${
              activeTab === 'community' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Comunidad
          </button>
          <button 
            onClick={() => setActiveTab('you')}
            className={`pb-3 text-sm font-black uppercase tracking-wide border-b-2 transition-colors ${
              activeTab === 'you' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Tu
          </button>
        </div>
      </header>

      {/* Feed Content */}
      <div className="space-y-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="font-bold uppercase tracking-wide text-sm">No hay actividades recientes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const [liked, setLiked] = useState(activity.hasKudos);
  const [likesCount, setLikesCount] = useState(activity.kudos);

  const toggleLike = () => {
    if (liked) {
      setLikesCount(p => p - 1);
    } else {
      setLikesCount(p => p + 1);
    }
    setLiked(!liked);
  };

  const handleShare = async () => {
    const activityUrl = `${window.location.origin}${window.location.pathname}#activity-${activity.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: activity.title,
          text: activity.description || activity.title,
          url: activityUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(activityUrl);
    } catch {
      // ignore share cancellation/errors
    }
  };

  const handleMenu = () => {
    // Placeholder for future menu actions (report/hide).
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'Run': return <Footprints size={16} />;
      case 'Ride': return <Bike size={16} />;
      case 'WeightTraining': return <Dumbbell size={16} />;
    }
  };

  return (
    <article className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <img src={activity.avatar} alt={activity.user} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
            <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-white">
              {getActivityIcon(activity.type)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-text uppercase tracking-wide hover:text-primary cursor-pointer transition-colors">
              {activity.user}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {activity.date}
            </p>
          </div>
        </div>
        <button onClick={handleMenu} className="text-slate-300 hover:text-text transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        <h2 className="text-xl font-display font-black italic text-text uppercase tracking-tight mb-1">
          {activity.title}
        </h2>
        {activity.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
            {activity.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-slate-50">
          {activity.stats.map((stat, idx) => (
            <div key={idx} className={`${idx !== 0 ? 'border-l border-slate-100 pl-4' : ''}`}>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-lg font-display font-black text-slate-700 italic tracking-tight">
                {stat.value} <span className="text-xs text-slate-400 font-bold not-italic ml-0.5">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Visual Content (Map or Photo) */}
        {activity.visual && (
          <div className="rounded-lg overflow-hidden relative bg-slate-100">
             {/* If it's a 'map', we can simulate a map overlay look */}
             {activity.type === 'Run' || activity.type === 'Ride' ? (
                <div className="relative">
                  <img src={activity.visual} alt="Content" className="w-full max-h-96 object-cover" />
                  {activity.visual.includes('map') && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={10} className="text-primary" /> Ruta
                    </div>
                  )}
                </div>
             ) : (
                <img src={activity.visual} alt="Photo" className="w-full max-h-96 object-cover" />
             )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
         <div className="flex gap-6">
            <button 
              onClick={toggleLike}
              className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                liked ? 'text-primary' : 'text-slate-500 hover:text-primary'
              }`}
            >
               {liked ? <Heart size={20} fill="currentColor" /> : <Heart size={20} />}
               <span>{likesCount}</span>
            </button>
         </div>

         <button onClick={handleShare} className="text-slate-400 hover:text-primary transition-colors">
            <Share2 size={18} />
         </button>
      </div>
    </article>
  );
};
