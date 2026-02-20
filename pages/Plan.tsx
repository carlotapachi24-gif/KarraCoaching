import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Dumbbell,
  ChevronRight,
  CheckCircle2,
  X,
  Zap,
  Play,
  Calendar,
  List,
  ChevronLeft,
  BookOpen,
  Info,
  Check,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { UserRole } from '../types';
import { Library } from './Library';

interface PlanProps {
  currentUserRole: UserRole;
  currentUserEmail: string;
}

interface PlanDay {
  id: string;
  day: string;
  title: string;
  duration: string;
  exercises: number;
  status: 'completed' | 'today' | 'upcoming';
  description: string;
}

interface PlanResponse {
  plan: {
    monthlyGoal: string;
    weeklySchedule: PlanDay[];
  };
}

interface LibraryResource {
  id: string;
  title: string;
  category: string;
  muscle: string;
  description: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const defaultExercisePool = [
  'Sentadilla Hack',
  'Prensa Inclinada',
  'Peso Muerto Rumano',
  'Press Banca Plano',
  'Remo con Barra',
  'Press Militar',
  'Dominadas',
  'Hip Thrust',
  'Curl Femoral',
  'Face Pull',
];

const mapWorkoutExercises = (workout: PlanDay, resources: LibraryResource[]) => {
  const fromLibrary = resources.slice(0, 8).map((item) => item.title);
  const pool = fromLibrary.length > 0 ? fromLibrary : defaultExercisePool;
  const offset = Math.abs(workout.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % pool.length;
  const items = [];
  const count = Math.max(3, Math.min(workout.exercises, 6));
  for (let i = 0; i < count; i += 1) {
    items.push(pool[(offset + i) % pool.length]);
  }
  return items;
};

export const Plan: React.FC<PlanProps> = ({ currentUserRole }) => {
  const [searchParams] = useSearchParams();
  const [selectedWorkout, setSelectedWorkout] = useState<PlanDay | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'library'>('weekly');
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<LibraryResource | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState('Plan de trabajo');
  const [weeklySchedule, setWeeklySchedule] = useState<PlanDay[]>([]);
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingWorkout, setIsUpdatingWorkout] = useState(false);
  const [error, setError] = useState('');

  const coachClientEmail = String(searchParams.get('client') || '').trim().toLowerCase();
  const targetEmail = currentUserRole === UserRole.COACH ? coachClientEmail : '';
  const canLoadPlan = currentUserRole === UserRole.CLIENT || !!targetEmail;

  const loadPlan = async () => {
    if (!canLoadPlan) {
      setWeeklySchedule([]);
      setError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    try {
      const query = currentUserRole === UserRole.COACH ? `?email=${encodeURIComponent(targetEmail)}` : '';
      const [planResponse, libraryResponse] = await Promise.all([
        fetch(apiUrl(`/api/plan${query}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl('/api/library'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!planResponse.ok) {
        throw new Error('No se pudo cargar el plan');
      }

      const planData = (await planResponse.json()) as PlanResponse;
      setMonthlyGoal(planData.plan.monthlyGoal || 'Plan de trabajo');
      setWeeklySchedule(planData.plan.weeklySchedule || []);

      if (libraryResponse.ok) {
        const libraryData = (await libraryResponse.json()) as { resources: LibraryResource[] };
        setLibraryResources(libraryData.resources || []);
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando plan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [currentUserRole, targetEmail]);

  const markWorkoutCompleted = async () => {
    if (!selectedWorkout) return;
    setIsUpdatingWorkout(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';

    try {
      const response = await fetch(apiUrl('/api/plan/day-status'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayId: selectedWorkout.id,
          status: 'completed',
          ...(currentUserRole === UserRole.COACH ? { email: targetEmail } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo actualizar el plan' }));
        throw new Error(body.message || 'No se pudo actualizar el plan');
      }

      setSelectedWorkout(null);
      await loadPlan();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el plan');
    } finally {
      setIsUpdatingWorkout(false);
    }
  };

  const monthCells = useMemo(() => {
    const daysInMonth = 31;
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const source = weeklySchedule[index % Math.max(weeklySchedule.length, 1)];
      return {
        day,
        status: source?.status || 'upcoming',
        workout: source || null,
      };
    });
  }, [weeklySchedule]);

  const selectedWorkoutExercises = useMemo(() => {
    if (!selectedWorkout) return [];
    return mapWorkoutExercises(selectedWorkout, libraryResources);
  }, [selectedWorkout, libraryResources]);

  const openExerciseDetail = (exerciseName: string) => {
    const fromLibrary = libraryResources.find(
      (resource) =>
        resource.title.toLowerCase() === exerciseName.toLowerCase() ||
        resource.title.toLowerCase().includes(exerciseName.toLowerCase()) ||
        exerciseName.toLowerCase().includes(resource.title.toLowerCase()),
    );

    if (fromLibrary) {
      setSelectedExerciseInfo(fromLibrary);
      return;
    }

    setSelectedExerciseInfo({
      id: `fallback-${exerciseName}`,
      title: exerciseName,
      category: 'General',
      muscle: 'N/A',
      description: 'Ejercicio de referencia dentro de la sesion seleccionada.',
    });
  };

  if (!canLoadPlan) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Mi Plan</h1>
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-slate-500">Selecciona un cliente desde cartera para abrir su plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {selectedExerciseInfo && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="aspect-video bg-slate-900 relative">
              <img
                src={`https://picsum.photos/seed/${encodeURIComponent(selectedExerciseInfo.id)}/800/500`}
                alt={selectedExerciseInfo.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                  <Play size={28} className="text-white ml-1" fill="currentColor" />
                </button>
              </div>
              <button
                onClick={() => setSelectedExerciseInfo(null)}
                className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedExerciseInfo.category}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <Dumbbell size={12} /> {selectedExerciseInfo.muscle}
                </span>
              </div>
              <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">
                {selectedExerciseInfo.title}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{selectedExerciseInfo.description}</p>
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

      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-white p-6 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <button
                onClick={() => setSelectedWorkout(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-colors"
              >
                <X size={20} />
              </button>
              <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-3 skew-x-[-10deg]">
                {selectedWorkout.day}
              </span>
              <h2 className="text-3xl font-display font-black mb-2 italic uppercase tracking-tight">{selectedWorkout.title}</h2>
              <div className="flex gap-4 text-white/90 text-sm font-bold">
                <span className="flex items-center gap-1"><Clock size={16} /> {selectedWorkout.duration}</span>
                <span className="flex items-center gap-1"><Dumbbell size={16} /> {selectedWorkout.exercises} ejercicios</span>
                <span className="flex items-center gap-1"><Zap size={16} /> Intensidad media-alta</span>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-bold text-lg text-text mb-2 uppercase tracking-tight">Objetivo de la sesion</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">{selectedWorkout.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider">Ejercicios principales</h3>
                {selectedWorkoutExercises.map((exercise, index) => (
                  <div
                    key={`${exercise}-${index}`}
                    onClick={() => openExerciseDetail(exercise)}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                        <Info size={16} />
                      </div>
                      <span className="font-bold text-text group-hover:text-primary transition-colors">
                        {index + 1}. {exercise}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 font-bold">3 x 8-12</span>
                  </div>
                ))}
              </div>

              {selectedWorkout.status === 'completed' ? (
                <button
                  disabled
                  className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 cursor-not-allowed uppercase italic tracking-wide"
                >
                  <CheckCircle2 size={20} /> Entrenamiento completado
                </button>
              ) : (
                <button
                  onClick={markWorkoutCompleted}
                  disabled={isUpdatingWorkout}
                  className="w-full bg-secondary text-white py-3 rounded-xl font-black text-lg shadow-lg shadow-secondary/20 hover:bg-secondary/90 flex items-center justify-center gap-2 transition-transform active:scale-95 uppercase italic tracking-wide disabled:opacity-70"
                >
                  <Check size={20} strokeWidth={3} /> {isUpdatingWorkout ? 'Guardando...' : 'Marcar como completado'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Mi Plan</h1>
          <p className="text-slate-500 mt-1 font-medium">{monthlyGoal}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <ViewButton icon={List} label="Semanal" active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} />
            <ViewButton icon={Calendar} label="Mensual" active={viewMode === 'monthly'} onClick={() => setViewMode('monthly')} />
            <ViewButton icon={BookOpen} label="Biblioteca" active={viewMode === 'library'} onClick={() => setViewMode('library')} />
          </div>

          <div className="hidden md:flex bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-slate-600">Fase activa</span>
          </div>
        </div>
      </header>

      {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
      {isLoading && <p className="text-sm text-slate-400 font-bold">Cargando plan...</p>}

      {!isLoading && viewMode === 'weekly' && (
        <div className="grid grid-cols-1 gap-4 animate-fade-in">
          {weeklySchedule.map((day) => (
            <WorkoutCard key={day.id} day={day} onClick={() => setSelectedWorkout(day)} />
          ))}
        </div>
      )}

      {!isLoading && viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-black text-2xl uppercase italic tracking-tight">Calendario mensual</h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {monthCells.map((cell) => (
              <button
                key={cell.day}
                onClick={() => cell.workout && setSelectedWorkout(cell.workout)}
                className={`aspect-square rounded-xl border relative group cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${
                  cell.status === 'today'
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                    : cell.status === 'completed'
                      ? 'bg-green-50 border-green-100 text-green-700 hover:border-green-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'
                }`}
              >
                <span className="text-sm md:text-lg font-black italic">{cell.day}</span>
                {cell.status === 'completed' && <CheckCircle2 size={16} className="md:w-5 md:h-5" />}
                {cell.status === 'upcoming' && <div className="w-2 h-2 bg-slate-300 rounded-full group-hover:bg-primary transition-colors"></div>}
                {cell.status === 'today' && <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded">Hoy</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-6 justify-center mt-8 pt-6 border-t border-slate-100">
            <LegendItem color="bg-green-100 border border-green-300" label="Completado" />
            <LegendItem color="bg-primary" label="Hoy" />
            <LegendItem color="bg-white border border-slate-300" label="Pendiente" />
          </div>
        </div>
      )}

      {viewMode === 'library' && <Library isEmbedded={true} readOnly={currentUserRole === UserRole.CLIENT} />}
    </div>
  );
};

const ViewButton = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
      active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
  </button>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`}></div>
    <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
  </div>
);

const WorkoutCard = ({ day, onClick }: { day: PlanDay; onClick: () => void }) => {
  const isCompleted = day.status === 'completed';
  const isToday = day.status === 'today';

  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-2xl border transition-all cursor-pointer group ${
        isToday
          ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.01]'
          : isCompleted
            ? 'bg-slate-50 border-slate-200 opacity-80'
            : 'bg-white border-slate-100 hover:border-primary/30 hover:shadow-md'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-4 right-4 text-green-600 bg-green-100 p-1 rounded-full">
          <CheckCircle2 size={20} />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className={`text-xs font-black uppercase tracking-wider mb-1 block ${isToday ? 'text-red-100' : 'text-slate-400'}`}>
            {day.day}
          </span>
          <h3 className={`font-display font-black text-xl md:text-2xl italic uppercase tracking-tight ${isToday ? 'text-white' : 'text-text'}`}>
            {day.title}
          </h3>
          <div className={`flex items-center gap-4 mt-2 text-sm font-bold ${isToday ? 'text-red-100' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1"><Clock size={16} /> {day.duration}</span>
            <span className="flex items-center gap-1"><Dumbbell size={16} /> {day.exercises} ejercicios</span>
          </div>
        </div>

        <button
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase tracking-wide ${
            isToday ? 'bg-white text-primary hover:bg-red-50' : 'bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white'
          }`}
        >
          {isCompleted ? 'Ver resultados' : 'Ver entrenamiento'}
          {!isCompleted && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
};
