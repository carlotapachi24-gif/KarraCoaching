import React, { useState } from 'react';
import { Clock, Dumbbell, ChevronRight, PlayCircle, CheckCircle2, X, Zap, Trophy, Play, Calendar, List, ChevronLeft, BookOpen, Info, Check } from 'lucide-react';
import { Library, initialExercises } from './Library';

export const Plan: React.FC = () => {
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'library'>('weekly');
  
  // State for the Exercise Detail Modal (embedded in Plan)
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<any>(null);

  // Converted to state to allow updates
  const [weeklySchedule, setWeeklySchedule] = useState([
    { day: 'Lunes', title: 'Pierna Hipertrofia', duration: '75 min', exercises: 6, status: 'completed', description: 'Enfoque en cuádriceps y gemelo. Mantener RIR 2 en sentadilla.' },
    { day: 'Martes', title: 'Empuje Fuerza', duration: '60 min', exercises: 5, status: 'today', description: 'Trabajo pesado de banca y militar. Descansos largos (3-5 min).' },
    { day: 'Miércoles', title: 'Descanso Activo', duration: '30 min', exercises: 1, status: 'upcoming', description: 'Caminata ligera o movilidad.' },
    { day: 'Jueves', title: 'Tracción Hipertrofia', duration: '70 min', exercises: 6, status: 'upcoming', description: 'Foco en dorsal ancho y bíceps.' },
    { day: 'Viernes', title: 'Full Body Metabólico', duration: '50 min', exercises: 8, status: 'upcoming', description: 'Circuito de alta intensidad.' },
    { day: 'Sábado', title: 'Cardio LISS', duration: '45 min', exercises: 1, status: 'upcoming', description: 'Bicicleta estática a ritmo conversacional.' },
    { day: 'Domingo', title: 'Descanso Total', duration: '-', exercises: 0, status: 'upcoming', description: 'Recuperación completa.' },
  ]);

  // Mock data for Monthly View (October 2024)
  const daysInMonth = 31;
  const startDayOffset = 1; // Tuesday start (0 = Monday for this grid logic)
  
  const getDayStatus = (day: number) => {
    if (day === 22) return 'today';
    if (day < 22) return day % 3 === 0 ? 'rest' : 'completed';
    return day % 3 === 0 ? 'rest' : 'upcoming';
  };

  const handleCalendarNav = () => {
    alert("Navegación de calendario desactivada en la demo.");
  };

  const handleExerciseClick = (exerciseName: string) => {
    // Fuzzy search for demo purposes
    const found = initialExercises.find(ex => 
      exerciseName.toLowerCase().includes(ex.title.toLowerCase()) || 
      ex.title.toLowerCase().includes(exerciseName.toLowerCase().split(' ')[0])
    );
    
    if (found) {
      setSelectedExerciseInfo(found);
    } else {
      // Fallback if not found in mock DB
      setSelectedExerciseInfo({
        title: exerciseName,
        category: "General",
        muscle: "N/A",
        img: "gym",
        description: "Detalles específicos de este ejercicio no disponibles en la demo.",
        isFallback: true
      });
    }
  };

  const handlePlayVideo = () => {
     alert(`Reproduciendo video para: ${selectedExerciseInfo?.title}`);
  };

  const handleCompleteWorkout = () => {
    if (!selectedWorkout) return;

    // Update the schedule state
    setWeeklySchedule(prev => prev.map(workout => 
      workout.day === selectedWorkout.day 
        ? { ...workout, status: 'completed' } 
        : workout
    ));

    // Close modal
    setSelectedWorkout(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      
      {/* Exercise Detail Modal (Overlay on top of Workout Modal or standalone) */}
      {selectedExerciseInfo && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col relative">
            <div className="aspect-video bg-slate-900 relative">
               <img src={`https://picsum.photos/seed/${selectedExerciseInfo.img}/800/500`} alt={selectedExerciseInfo.title} className="w-full h-full object-cover opacity-60" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <button 
                  onClick={handlePlayVideo}
                  className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 cursor-pointer hover:scale-110 transition-transform group"
                 >
                    <Play size={28} className="text-white ml-1 group-hover:fill-white" fill="currentColor" />
                 </button>
               </div>
               <button onClick={() => setSelectedExerciseInfo(null)} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{selectedExerciseInfo.category}</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1"><Dumbbell size={12}/> {selectedExerciseInfo.muscle}</span>
              </div>
              <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">{selectedExerciseInfo.title}</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{selectedExerciseInfo.description}</p>
              
              {!selectedExerciseInfo.isFallback && (
                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-sm text-text uppercase">Puntos Clave</h3>
                  <ul className="text-sm text-slate-500 space-y-1 list-disc pl-4 font-medium">
                    <li>Mantener la espalda neutra.</li>
                    <li>Controlar el movimiento.</li>
                  </ul>
                </div>
              )}

              <button 
                onClick={() => setSelectedExerciseInfo(null)}
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wide"
              >
                Volver al entreno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
             <div className="bg-primary text-white p-6 relative overflow-hidden shrink-0">
               {/* Decorative Element */}
               <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
               
               <button 
                 onClick={() => setSelectedWorkout(null)} 
                 className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-colors"
               >
                 <X size={20} />
               </button>
               <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-3 skew-x-[-10deg]">
                 {selectedWorkout.day || 'Detalle Sesión'}
               </span>
               <h2 className="text-3xl font-display font-black mb-2 italic uppercase tracking-tight">{selectedWorkout.title || 'Entrenamiento'}</h2>
               <div className="flex gap-4 text-white/90 text-sm font-bold">
                 <span className="flex items-center gap-1"><Clock size={16} /> {selectedWorkout.duration || '60 min'}</span>
                 <span className="flex items-center gap-1"><Dumbbell size={16} /> {selectedWorkout.exercises || '5'} ejercicios</span>
                 <span className="flex items-center gap-1"><Zap size={16} /> Intensidad Alta</span>
               </div>
             </div>
             
             <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-text mb-2 uppercase tracking-tight">Objetivo de la sesión</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">{selectedWorkout.description || 'Sigue el plan establecido enfocándote en la técnica.'}</p>
                </div>

                <div className="space-y-3 mb-6">
                   <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider">Ejercicios Principales</h3>
                   
                   {/* Interactive Exercise List */}
                   <div 
                     onClick={() => handleExerciseClick("Sentadilla Hack")}
                     className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group"
                   >
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                            <Info size={16} />
                         </div>
                         <span className="font-bold text-text group-hover:text-primary transition-colors">1. Sentadilla Hack</span>
                      </div>
                      <span className="text-sm text-slate-500 font-bold">3 x 8-10</span>
                   </div>

                   <div 
                     onClick={() => handleExerciseClick("Prensa Inclinada")}
                     className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group"
                   >
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                            <Info size={16} />
                         </div>
                         <span className="font-bold text-text group-hover:text-primary transition-colors">2. Prensa Inclinada</span>
                      </div>
                      <span className="text-sm text-slate-500 font-bold">4 x 12-15</span>
                   </div>

                   <div 
                     onClick={() => handleExerciseClick("Extensiones Cuádriceps")}
                     className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group"
                   >
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                            <Info size={16} />
                         </div>
                         <span className="font-bold text-text group-hover:text-primary transition-colors">3. Extensiones Cuádriceps</span>
                      </div>
                      <span className="text-sm text-slate-500 font-bold">3 x 15-20</span>
                   </div>
                </div>

                {selectedWorkout.status === 'completed' ? (
                   <button 
                    disabled
                    className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 cursor-not-allowed uppercase italic tracking-wide"
                  >
                    <CheckCircle2 size={20} /> ¡Entrenamiento Completado!
                  </button>
                ) : (
                  <button 
                    onClick={handleCompleteWorkout}
                    className="w-full bg-secondary text-white py-3 rounded-xl font-black text-lg shadow-lg shadow-secondary/20 hover:bg-secondary/90 flex items-center justify-center gap-2 transition-transform active:scale-95 uppercase italic tracking-wide"
                  >
                    <Check size={20} strokeWidth={3} /> Marcar como completado
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Mi Plan</h1>
          <p className="text-slate-500 mt-1 font-medium">Semana 4 - Bloque de Acumulación</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <button 
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                viewMode === 'weekly' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <List size={16} /> <span className="hidden sm:inline">Semanal</span>
            </button>
            <button 
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                viewMode === 'monthly' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Calendar size={16} /> <span className="hidden sm:inline">Mensual</span>
            </button>
            <button 
              onClick={() => setViewMode('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                viewMode === 'library' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <BookOpen size={16} /> <span className="hidden sm:inline">Biblioteca</span>
            </button>
          </div>
          
          <div className="hidden md:flex bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-sm font-bold text-slate-600">Fase: Hipertrofia</span>
          </div>
        </div>
      </header>

      {/* Content Switcher */}
      {viewMode === 'weekly' ? (
        <div className="grid grid-cols-1 gap-4 animate-fade-in">
          {weeklySchedule.map((day, index) => (
            <WorkoutCard 
              key={index} 
              {...day} 
              onClick={() => setSelectedWorkout(day)}
            />
          ))}
        </div>
      ) : viewMode === 'monthly' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in">
          {/* Monthly Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-black text-2xl uppercase italic tracking-tight">Octubre 2024</h2>
            <div className="flex gap-2">
              <button onClick={handleCalendarNav} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft size={20} className="text-slate-400" /></button>
              <button onClick={handleCalendarNav} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight size={20} className="text-slate-400" /></button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {/* Empty cells for start offset */}
            {[...Array(startDayOffset)].map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}

            {/* Days */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const status = getDayStatus(day);
              
              return (
                <div 
                  key={day} 
                  onClick={() => status !== 'rest' && setSelectedWorkout({ day: `Octubre ${day}`, title: status === 'completed' ? 'Sesión Completada' : 'Entrenamiento Programado' })}
                  className={`aspect-square rounded-xl border relative group cursor-pointer transition-all flex flex-col items-center justify-center gap-1
                    ${status === 'today' 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105 z-10' 
                      : status === 'completed'
                        ? 'bg-green-50 border-green-100 text-green-700 hover:border-green-300'
                        : status === 'rest'
                          ? 'bg-slate-50 border-slate-100 text-slate-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'
                    }
                  `}
                >
                   <span className="text-sm md:text-lg font-black italic">{day}</span>
                   
                   {/* Status Indicator */}
                   {status === 'completed' && <CheckCircle2 size={16} className="md:w-5 md:h-5" />}
                   {status === 'upcoming' && <div className="w-2 h-2 bg-slate-300 rounded-full group-hover:bg-primary transition-colors"></div>}
                   {status === 'rest' && <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wide opacity-60">Rest</span>}
                   {status === 'today' && <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded">Hoy</span>}
                </div>
              );
            })}
          </div>

          <div className="flex gap-6 justify-center mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
              <span className="text-xs font-bold text-slate-500 uppercase">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-xs font-bold text-slate-500 uppercase">Hoy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div>
              <span className="text-xs font-bold text-slate-500 uppercase">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-100 rounded-full"></div>
              <span className="text-xs font-bold text-slate-500 uppercase">Descanso</span>
            </div>
          </div>
        </div>
      ) : (
        /* Library View */
        <Library isEmbedded={true} readOnly={true} />
      )}
    </div>
  );
};

const WorkoutCard = ({ day, title, duration, exercises, status, onClick }: any) => {
  const isCompleted = status === 'completed';
  const isToday = status === 'today';

  return (
    <div 
      onClick={onClick}
      className={`relative p-6 rounded-2xl border transition-all cursor-pointer group ${
      isToday 
        ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.01]' 
        : isCompleted 
          ? 'bg-slate-50 border-slate-200 opacity-70' 
          : 'bg-white border-slate-100 hover:border-primary/30 hover:shadow-md'
    }`}>
      {isCompleted && (
        <div className="absolute top-4 right-4 text-green-600 bg-green-100 p-1 rounded-full">
          <CheckCircle2 size={20} />
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className={`text-xs font-black uppercase tracking-wider mb-1 block ${isToday ? 'text-red-100' : 'text-slate-400'}`}>
            {day}
          </span>
          <h3 className={`font-display font-black text-xl md:text-2xl italic uppercase tracking-tight ${isToday ? 'text-white' : 'text-text'}`}>
            {title}
          </h3>
          <div className={`flex items-center gap-4 mt-2 text-sm font-bold ${isToday ? 'text-red-100' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1"><Clock size={16} /> {duration}</span>
            <span className="flex items-center gap-1"><Dumbbell size={16} /> {exercises} ejercicios</span>
          </div>
        </div>

        <button className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase tracking-wide ${
          isToday 
            ? 'bg-white text-primary hover:bg-red-50' 
            : 'bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white'
        }`}>
          {isCompleted ? 'Ver Resultados' : 'Ver Entrenamiento'}
          {!isCompleted && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
};