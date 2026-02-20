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
  Save,
  Plus,
  Trash2,
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

interface MonthlyWeek {
  id: string;
  weekLabel: string;
  focus: string;
  objective: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface PlanResponse {
  plan: {
    monthlyGoal: string;
    weeklySchedule: PlanDay[];
    monthlyPlan?: MonthlyWeek[];
  };
}

interface LibraryResource {
  id: string;
  title: string;
  category: string;
  muscle: string;
  description: string;
}

interface CoachClient {
  email: string;
  name: string;
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

const createDefaultMonthlyWeek = (index: number): MonthlyWeek => ({
  id: `week-${Date.now()}-${index}`,
  weekLabel: `Semana ${index + 1}`,
  focus: '',
  objective: '',
  status: index === 0 ? 'current' : 'upcoming',
});

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
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'library'>('weekly');
  const [selectedWorkout, setSelectedWorkout] = useState<PlanDay | null>(null);
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<LibraryResource | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState('Plan de trabajo');
  const [weeklySchedule, setWeeklySchedule] = useState<PlanDay[]>([]);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyWeek[]>([]);
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [coachClients, setCoachClients] = useState<CoachClient[]>([]);
  const [selectedCoachClientEmail, setSelectedCoachClientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isUpdatingWorkout, setIsUpdatingWorkout] = useState(false);
  const [error, setError] = useState('');

  const coachClientFromQuery = String(searchParams.get('client') || '').trim().toLowerCase();
  const isCoachMode = currentUserRole === UserRole.COACH;
  const targetEmail = isCoachMode ? selectedCoachClientEmail : '';
  const canLoadPlan = currentUserRole === UserRole.CLIENT || !!targetEmail;

  useEffect(() => {
    if (!isCoachMode) return;
    setSelectedCoachClientEmail(coachClientFromQuery);
  }, [coachClientFromQuery, isCoachMode]);

  const loadCoachClients = async () => {
    if (!isCoachMode) return;
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const response = await fetch(apiUrl('/api/clients'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('No se pudieron cargar los clientes');
    }
    const data = (await response.json()) as { clients: CoachClient[] };
    const normalizedClients = data.clients.map((client) => ({
      ...client,
      email: client.email.toLowerCase(),
    }));
    setCoachClients(normalizedClients);

    setSelectedCoachClientEmail((previousEmail) => {
      if (normalizedClients.length === 0) {
        return '';
      }

      const preferredEmail = (previousEmail || coachClientFromQuery).trim().toLowerCase();
      const exists = normalizedClients.some((client) => client.email === preferredEmail);
      return exists ? preferredEmail : normalizedClients[0].email;
    });
  };

  const loadPlan = async () => {
    if (!canLoadPlan) {
      setWeeklySchedule([]);
      setMonthlyPlan([]);
      setError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    try {
      const query = isCoachMode ? `?email=${encodeURIComponent(targetEmail)}` : '';
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
      const normalizedMonthly = planData.plan.monthlyPlan || [];
      setMonthlyPlan(
        normalizedMonthly.length > 0
          ? normalizedMonthly
          : [0, 1, 2, 3].map((index) => createDefaultMonthlyWeek(index)),
      );

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
    const bootstrap = async () => {
      try {
        if (isCoachMode) {
          await loadCoachClients();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando clientes');
      }
    };
    bootstrap();
  }, [isCoachMode]);

  useEffect(() => {
    loadPlan();
  }, [isCoachMode, targetEmail, currentUserRole]);

  const saveCoachPlan = async () => {
    if (!isCoachMode || !targetEmail) return;
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsSavingPlan(true);
    try {
      const response = await fetch(apiUrl(`/api/plan?email=${encodeURIComponent(targetEmail)}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthlyGoal,
          weeklySchedule,
          monthlyPlan,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo guardar el plan' }));
        throw new Error(body.message || 'No se pudo guardar el plan');
      }

      await loadPlan();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

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
          ...(isCoachMode ? { email: targetEmail } : {}),
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

  const updateWorkout = <K extends keyof PlanDay>(id: string, key: K, value: PlanDay[K]) => {
    setWeeklySchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const addWorkout = () => {
    setWeeklySchedule((prev) => [
      ...prev,
      {
        id: `day-${Date.now()}`,
        day: `Dia ${prev.length + 1}`,
        title: 'Nueva sesion',
        duration: '60 min',
        exercises: 5,
        status: 'upcoming',
        description: 'Describe el objetivo de esta sesion.',
      },
    ]);
  };

  const removeWorkout = (id: string) => {
    setWeeklySchedule((prev) => prev.filter((item) => item.id !== id));
  };

  const updateMonthlyWeek = <K extends keyof MonthlyWeek>(id: string, key: K, value: MonthlyWeek[K]) => {
    setMonthlyPlan((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const addMonthlyWeek = () => {
    setMonthlyPlan((prev) => [...prev, createDefaultMonthlyWeek(prev.length)]);
  };

  const removeMonthlyWeek = (id: string) => {
    setMonthlyPlan((prev) => prev.filter((item) => item.id !== id));
  };

  const selectedCoachClient = useMemo(
    () => coachClients.find((client) => client.email.toLowerCase() === selectedCoachClientEmail),
    [coachClients, selectedCoachClientEmail],
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {selectedExerciseInfo && (
        <ExerciseModal resource={selectedExerciseInfo} onClose={() => setSelectedExerciseInfo(null)} />
      )}

      {selectedWorkout && (
        <WorkoutModal
          workout={selectedWorkout}
          exercises={selectedWorkoutExercises}
          onClose={() => setSelectedWorkout(null)}
          onOpenExercise={openExerciseDetail}
          onMarkCompleted={markWorkoutCompleted}
          isUpdating={isUpdatingWorkout}
        />
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Mi Plan</h1>
          <p className="text-slate-500 mt-1 font-medium">{monthlyGoal}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isCoachMode && (
            <select
              value={selectedCoachClientEmail}
              onChange={(event) => setSelectedCoachClientEmail(event.target.value.toLowerCase())}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
            >
              {coachClients.length === 0 && <option value="">Sin clientes</option>}
              {coachClients.map((client) => (
                <option key={client.email} value={client.email.toLowerCase()}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          )}

          <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <ViewButton icon={List} label="Semanal" active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} />
            <ViewButton icon={Calendar} label="Mensual" active={viewMode === 'monthly'} onClick={() => setViewMode('monthly')} />
            <ViewButton icon={BookOpen} label="Biblioteca" active={viewMode === 'library'} onClick={() => setViewMode('library')} />
          </div>
        </div>
      </header>

      {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
      {isLoading && <p className="text-sm text-slate-400 font-bold">Cargando plan...</p>}

      {!isLoading && isCoachMode && canLoadPlan && (
        <section className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black italic uppercase text-2xl tracking-tight text-text">Editor del coach</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Edicion individual para {selectedCoachClient?.name || selectedCoachClientEmail}
              </p>
            </div>
            <button
              onClick={saveCoachPlan}
              disabled={isSavingPlan}
              className="px-5 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center gap-2 disabled:opacity-70"
            >
              <Save size={16} /> {isSavingPlan ? 'Guardando...' : 'Guardar plan del cliente'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Objetivo mensual</label>
            <input
              value={monthlyGoal}
              onChange={(event) => setMonthlyGoal(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Planificacion semanal</h3>
              <button onClick={addWorkout} className="text-xs font-black uppercase tracking-wide text-primary flex items-center gap-1">
                <Plus size={14} /> Agregar dia
              </button>
            </div>
            {weeklySchedule.map((day) => (
              <div key={day.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <input value={day.day} onChange={(e) => updateWorkout(day.id, 'day', e.target.value)} className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <input value={day.title} onChange={(e) => updateWorkout(day.id, 'title', e.target.value)} className="md:col-span-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <input value={day.duration} onChange={(e) => updateWorkout(day.id, 'duration', e.target.value)} className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <input type="number" min={0} value={day.exercises} onChange={(e) => updateWorkout(day.id, 'exercises', Number(e.target.value) || 0)} className="md:col-span-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <select value={day.status} onChange={(e) => updateWorkout(day.id, 'status', e.target.value as PlanDay['status'])} className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold">
                  <option value="completed">completed</option>
                  <option value="today">today</option>
                  <option value="upcoming">upcoming</option>
                </select>
                <button onClick={() => removeWorkout(day.id)} className="md:col-span-2 bg-white border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm font-black uppercase flex items-center justify-center gap-1">
                  <Trash2 size={14} /> Quitar
                </button>
                <textarea value={day.description} onChange={(e) => updateWorkout(day.id, 'description', e.target.value)} className="md:col-span-12 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium min-h-[70px]" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Planificacion mensual</h3>
              <button onClick={addMonthlyWeek} className="text-xs font-black uppercase tracking-wide text-primary flex items-center gap-1">
                <Plus size={14} /> Agregar semana
              </button>
            </div>
            {monthlyPlan.map((week) => (
              <div key={week.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <input value={week.weekLabel} onChange={(e) => updateMonthlyWeek(week.id, 'weekLabel', e.target.value)} className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <input value={week.focus} onChange={(e) => updateMonthlyWeek(week.id, 'focus', e.target.value)} className="md:col-span-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <input value={week.objective} onChange={(e) => updateMonthlyWeek(week.id, 'objective', e.target.value)} className="md:col-span-5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" />
                <select value={week.status} onChange={(e) => updateMonthlyWeek(week.id, 'status', e.target.value as MonthlyWeek['status'])} className="md:col-span-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold">
                  <option value="completed">completed</option>
                  <option value="current">current</option>
                  <option value="upcoming">upcoming</option>
                </select>
                <button onClick={() => removeMonthlyWeek(week.id)} className="md:col-span-1 bg-white border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm font-black uppercase flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isLoading && !canLoadPlan && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-slate-500">Selecciona un cliente para abrir su plan.</p>
        </div>
      )}

      {!isLoading && canLoadPlan && viewMode === 'weekly' && (
        <div className="grid grid-cols-1 gap-4 animate-fade-in">
          {weeklySchedule.map((day) => (
            <WorkoutCard key={day.id} day={day} onClick={() => setSelectedWorkout(day)} />
          ))}
        </div>
      )}

      {!isLoading && canLoadPlan && viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {monthlyPlan.map((week) => (
              <div key={week.id} className={`rounded-xl border p-4 ${week.status === 'current' ? 'border-primary bg-primary/5' : week.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{week.weekLabel}</p>
                <h4 className="font-black uppercase text-sm text-text mt-1">{week.focus || 'Sin foco'}</h4>
                <p className="text-xs font-medium text-slate-600 mt-2">{week.objective || 'Sin objetivo definido.'}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black text-2xl uppercase italic tracking-tight">Calendario mensual</h2>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft size={20} className="text-slate-400" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight size={20} className="text-slate-400" /></button>
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
          </div>
        </div>
      )}

      {viewMode === 'library' && <Library isEmbedded={true} readOnly={currentUserRole === UserRole.CLIENT} />}
    </div>
  );
};

const ViewButton = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
      active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
  </button>
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
          <span className={`text-xs font-black uppercase tracking-wider mb-1 block ${isToday ? 'text-red-100' : 'text-slate-400'}`}>{day.day}</span>
          <h3 className={`font-display font-black text-xl md:text-2xl italic uppercase tracking-tight ${isToday ? 'text-white' : 'text-text'}`}>{day.title}</h3>
          <div className={`flex items-center gap-4 mt-2 text-sm font-bold ${isToday ? 'text-red-100' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1"><Clock size={16} /> {day.duration}</span>
            <span className="flex items-center gap-1"><Dumbbell size={16} /> {day.exercises} ejercicios</span>
          </div>
        </div>

        <button className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase tracking-wide ${
          isToday ? 'bg-white text-primary hover:bg-red-50' : 'bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white'
        }`}>
          {isCompleted ? 'Ver resultados' : 'Ver entrenamiento'}
          {!isCompleted && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
};

const ExerciseModal = ({ resource, onClose }: { resource: LibraryResource; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
      <div className="aspect-video bg-slate-900 relative">
        <img src={`https://picsum.photos/seed/${encodeURIComponent(resource.id)}/800/500`} alt={resource.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
            <Play size={28} className="text-white ml-1" fill="currentColor" />
          </button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{resource.category}</span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1"><Dumbbell size={12} /> {resource.muscle}</span>
        </div>
        <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">{resource.title}</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{resource.description}</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wide">
          Volver
        </button>
      </div>
    </div>
  </div>
);

const WorkoutModal = ({
  workout,
  exercises,
  onClose,
  onOpenExercise,
  onMarkCompleted,
  isUpdating,
}: {
  workout: PlanDay;
  exercises: string[];
  onClose: () => void;
  onOpenExercise: (exercise: string) => void;
  onMarkCompleted: () => void;
  isUpdating: boolean;
}) => (
  <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
      <div className="bg-primary text-white p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-colors">
          <X size={20} />
        </button>
        <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-3 skew-x-[-10deg]">{workout.day}</span>
        <h2 className="text-3xl font-display font-black mb-2 italic uppercase tracking-tight">{workout.title}</h2>
        <div className="flex gap-4 text-white/90 text-sm font-bold">
          <span className="flex items-center gap-1"><Clock size={16} /> {workout.duration}</span>
          <span className="flex items-center gap-1"><Dumbbell size={16} /> {workout.exercises} ejercicios</span>
          <span className="flex items-center gap-1"><Zap size={16} /> Intensidad media-alta</span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h3 className="font-bold text-lg text-text mb-2 uppercase tracking-tight">Objetivo de la sesion</h3>
          <p className="text-slate-600 text-sm leading-relaxed font-medium">{workout.description}</p>
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider">Ejercicios principales</h3>
          {exercises.map((exercise, index) => (
            <div
              key={`${exercise}-${index}`}
              onClick={() => onOpenExercise(exercise)}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                  <Info size={16} />
                </div>
                <span className="font-bold text-text group-hover:text-primary transition-colors">{index + 1}. {exercise}</span>
              </div>
              <span className="text-sm text-slate-500 font-bold">3 x 8-12</span>
            </div>
          ))}
        </div>

        {workout.status === 'completed' ? (
          <button disabled className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 cursor-not-allowed uppercase italic tracking-wide">
            <CheckCircle2 size={20} /> Entrenamiento completado
          </button>
        ) : (
          <button onClick={onMarkCompleted} disabled={isUpdating} className="w-full bg-secondary text-white py-3 rounded-xl font-black text-lg shadow-lg shadow-secondary/20 hover:bg-secondary/90 flex items-center justify-center gap-2 transition-transform active:scale-95 uppercase italic tracking-wide disabled:opacity-70">
            <Check size={20} strokeWidth={3} /> {isUpdating ? 'Guardando...' : 'Marcar como completado'}
          </button>
        )}
      </div>
    </div>
  </div>
);
