import React, { useState } from 'react';
import { Search, Play, Filter, Plus, Dumbbell, Tag, X, Save, Video, Info } from 'lucide-react';

export const initialExercises = [
  { id: 1, title: "Sentadilla Barra Trasera", category: "Pierna", muscle: "Cuádriceps", img: "squat", description: "Ejercicio compuesto fundamental para el desarrollo del tren inferior." },
  { id: 2, title: "Press Banca Plano", category: "Empuje", muscle: "Pectoral", img: "bench", description: "Movimiento básico de empuje horizontal para pecho y tríceps." },
  { id: 3, title: "Peso Muerto Rumano", category: "Pierna", muscle: "Isquios", img: "deadlift", description: "Variante de peso muerto enfocado en la cadena posterior y cadera." },
  { id: 4, title: "Dominadas", category: "Tracción", muscle: "Dorsal", img: "pullup", description: "Ejercicio de tracción vertical con peso corporal." },
  { id: 5, title: "Press Militar", category: "Empuje", muscle: "Hombros", img: "press", description: "Empuje vertical estricto para hombros y estabilidad." },
  { id: 6, title: "Curl con Barra", category: "Tracción", muscle: "Bíceps", img: "curl", description: "Aislamiento clásico para bíceps braquial." },
  { id: 7, title: "Extensiones de Tríceps", category: "Empuje", muscle: "Tríceps", img: "triceps", description: "Ejercicio de aislamiento en polea alta." },
  { id: 8, title: "Zancadas", category: "Pierna", muscle: "Glúteo", img: "lunge", description: "Ejercicio unilateral para estabilidad y fuerza de piernas." },
  { id: 9, title: "Sentadilla Hack", category: "Pierna", muscle: "Cuádriceps", img: "legpress", description: "Variante de sentadilla en máquina para mayor estabilidad y enfoque en cuádriceps." },
  { id: 10, title: "Prensa Inclinada", category: "Pierna", muscle: "Cuádriceps", img: "legpress", description: "Movimiento compuesto de empuje de piernas en máquina." },
  { id: 11, title: "Extensiones Cuádriceps", category: "Pierna", muscle: "Cuádriceps", img: "legext", description: "Ejercicio de aislamiento para la parte anterior del muslo." },
];

interface LibraryProps {
  isEmbedded?: boolean;
  readOnly?: boolean;
}

export const Library: React.FC<LibraryProps> = ({ isEmbedded = false, readOnly = false }) => {
  const [exercises, setExercises] = useState(initialExercises);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  
  // New Exercise Form State
  const [newExercise, setNewExercise] = useState({ title: '', category: 'Pierna', muscle: '' });

  const categories = ['Todos', 'Pierna', 'Torso', 'Empuje', 'Tracción', 'Cardio'];

  const filteredExercises = exercises.filter(ex => {
    const matchesFilter = activeFilter === 'Todos' || ex.category === activeFilter;
    const matchesSearch = ex.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ex.muscle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = exercises.length + 1;
    const exerciseToAdd = {
      id: newId,
      title: newExercise.title,
      category: newExercise.category,
      muscle: newExercise.muscle,
      img: 'gym', // Default placeholder
      description: 'Nuevo ejercicio personalizado.'
    };
    
    setExercises([exerciseToAdd, ...exercises]);
    setIsModalOpen(false);
    setNewExercise({ title: '', category: 'Pierna', muscle: '' });
  };

  const handlePlayVideo = () => {
    alert(`Reproduciendo video demo para: ${selectedExercise.title}`);
  };

  return (
    <div className={`space-y-8 animate-fade-in relative ${isEmbedded ? '' : 'pb-12'}`}>
      
      {/* Exercise Details Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col">
            <div className="aspect-video bg-slate-900 relative">
               <img src={`https://picsum.photos/seed/${selectedExercise.img}/800/500`} alt={selectedExercise.title} className="w-full h-full object-cover opacity-60" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                  onClick={handlePlayVideo}
                  className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 cursor-pointer hover:scale-110 transition-transform group"
                 >
                    <Play size={28} className="text-white ml-1 group-hover:fill-white" fill="currentColor" />
                 </button>
               </div>
               <button onClick={() => setSelectedExercise(null)} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{selectedExercise.category}</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1"><Dumbbell size={12}/> {selectedExercise.muscle}</span>
              </div>
              <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">{selectedExercise.title}</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{selectedExercise.description}</p>
              
              <div className="space-y-2 mb-6">
                <h3 className="font-bold text-sm text-text uppercase">Puntos Clave</h3>
                <ul className="text-sm text-slate-500 space-y-1 list-disc pl-4 font-medium">
                  <li>Mantener la espalda neutra durante todo el movimiento.</li>
                  <li>Controlar la fase excéntrica (bajada).</li>
                  <li>Respirar adecuadamente: inspirar antes de bajar, expirar al subir.</li>
                </ul>
              </div>

              <button 
                onClick={() => setSelectedExercise(null)}
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wide"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl text-text uppercase italic">Añadir Ejercicio</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-text"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre del Ejercicio</label>
                <input 
                  type="text" 
                  required
                  value={newExercise.title}
                  onChange={e => setNewExercise({...newExercise, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                  placeholder="Ej. Hip Thrust"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
                  <select 
                    value={newExercise.category}
                    onChange={e => setNewExercise({...newExercise, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold"
                  >
                    {categories.filter(c => c !== 'Todos').map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Músculo Principal</label>
                  <input 
                    type="text" 
                    required
                    value={newExercise.muscle}
                    onChange={e => setNewExercise({...newExercise, muscle: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                    placeholder="Ej. Glúteo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Video URL (Opcional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 pl-10 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                    placeholder="Youtube / Vimeo"
                  />
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-wide"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isEmbedded && (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Biblioteca de Ejercicios</h1>
            <p className="text-slate-500 mt-1 font-medium">{exercises.length} ejercicios disponibles.</p>
          </div>
          {!readOnly && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95 uppercase tracking-wide"
            >
              <Plus size={20} /> Añadir Ejercicio
            </button>
          )}
        </header>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Buscar ejercicio o músculo..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
           />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors uppercase tracking-wide ${
                activeFilter === cat 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredExercises.length > 0 ? (
          filteredExercises.map(ex => (
            <ExerciseCard 
              key={ex.id} 
              title={ex.title} 
              category={ex.category} 
              muscle={ex.muscle} 
              img={ex.img} 
              onClick={() => setSelectedExercise(ex)}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            No se encontraron ejercicios que coincidan con tu búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};

const ExerciseCard = ({ title, category, muscle, img, onClick }: any) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-1"
  >
    <div className="aspect-video bg-slate-200 relative overflow-hidden">
      <img src={`https://picsum.photos/seed/${img}/400/250`} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/50">
          <Play fill="currentColor" size={20} />
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide">
        VIDEO
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{category}</span>
      </div>
      <h3 className="font-bold text-text text-lg leading-tight mb-3 uppercase">{title}</h3>
      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
        <Dumbbell size={14} /> <span>{muscle}</span>
      </div>
    </div>
  </div>
);