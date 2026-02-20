import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  List,
  X,
  Check,
  BookOpen,
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

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

export const Plan: React.FC<PlanProps> = ({ currentUserRole }) => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'library'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('Bloque de trabajo');
  const [weeklySchedule, setWeeklySchedule] = useState<PlanDay[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<PlanDay | null>(null);

  const coachClientEmail = String(searchParams.get('client') || '').trim().toLowerCase();
  const targetEmail = currentUserRole === UserRole.COACH ? coachClientEmail : '';
  const canLoadPlan = currentUserRole === UserRole.CLIENT || !!targetEmail;

  const loadPlan = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsLoading(true);
    try {
      if (!canLoadPlan) {
        setWeeklySchedule([]);
        setError('');
        return;
      }

      const query = currentUserRole === UserRole.COACH ? `?email=${encodeURIComponent(targetEmail)}` : '';
      const response = await fetch(apiUrl(`/api/plan${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('No se pudo cargar el plan');
      }

      const data = (await response.json()) as PlanResponse;
      setWeeklySchedule(data.plan.weeklySchedule || []);
      setMonthlyGoal(data.plan.monthlyGoal || 'Bloque de trabajo');
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

  const markWorkoutAsCompleted = async (day: PlanDay) => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsUpdating(true);
    try {
      const response = await fetch(apiUrl('/api/plan/day-status'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayId: day.id,
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
      setIsUpdating(false);
    }
  };

  const monthCells = useMemo(() => {
    const daysInMonth = 31;
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const weeklyItem = weeklySchedule[index % Math.max(weeklySchedule.length, 1)];
      const status = weeklyItem?.status || 'upcoming';
      return { day, status };
    });
  }, [weeklySchedule]);

  if (!canLoadPlan) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
        <h1 className="font-display text-3xl font-black italic uppercase text-text">Plan Semanal</h1>
        <p className="mt-3 text-sm font-bold text-slate-500">Selecciona un cliente desde la cartera para abrir su plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-primary text-white p-6 relative">
              <button onClick={() => setSelectedWorkout(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                <X size={20} />
              </button>
              <p className="text-[10px] font-black uppercase tracking-wider">{selectedWorkout.day}</p>
              <h2 className="text-3xl font-display font-black italic uppercase tracking-tight mt-2">{selectedWorkout.title}</h2>
              <p className="text-sm mt-3 font-bold flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Clock size={14} /> {selectedWorkout.duration}</span>
                <span className="inline-flex items-center gap-1"><Dumbbell size={14} /> {selectedWorkout.exercises} ejercicios</span>
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 font-medium mb-6">{selectedWorkout.description}</p>
              {selectedWorkout.status === 'completed' ? (
                <div className="w-full bg-green-50 text-green-700 py-3 rounded-xl font-black text-sm uppercase tracking-wide text-center">
                  Entrenamiento ya completado
                </div>
              ) : (
                <button
                  onClick={() => markWorkoutAsCompleted(selectedWorkout)}
                  disabled={isUpdating}
                  className="w-full bg-secondary text-white py-3 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Check size={16} /> {isUpdating ? 'Guardando...' : 'Marcar como completado'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Plan Semanal</h1>
          <p className="text-slate-500 mt-1 font-medium">{monthlyGoal}</p>
        </div>
        <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <ViewButton icon={List} label="Semanal" active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} />
          <ViewButton icon={Calendar} label="Mensual" active={viewMode === 'monthly'} onClick={() => setViewMode('monthly')} />
          <ViewButton icon={BookOpen} label="Biblioteca" active={viewMode === 'library'} onClick={() => setViewMode('library')} />
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
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell) => (
              <div
                key={cell.day}
                className={`aspect-square rounded-xl border text-xs font-black uppercase flex items-center justify-center ${
                  cell.status === 'completed'
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : cell.status === 'today'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}
              >
                {cell.day}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'library' && (
        <Library isEmbedded={true} readOnly={currentUserRole === UserRole.CLIENT} />
      )}
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
    <Icon size={16} />
    <span className="hidden sm:inline">{label}</span>
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
            ? 'bg-slate-50 border-slate-200'
            : 'bg-white border-slate-100 hover:border-primary/30 hover:shadow-md'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-4 right-4 text-green-600 bg-green-100 p-1 rounded-full">
          <CheckCircle2 size={20} />
        </div>
      )}
      <span className={`text-xs font-black uppercase tracking-wider ${isToday ? 'text-red-100' : 'text-slate-400'}`}>{day.day}</span>
      <h3 className={`font-display font-black text-xl md:text-2xl italic uppercase tracking-tight mt-1 ${isToday ? 'text-white' : 'text-text'}`}>
        {day.title}
      </h3>
      <div className={`flex items-center gap-4 mt-3 text-sm font-bold ${isToday ? 'text-red-100' : 'text-slate-500'}`}>
        <span className="flex items-center gap-1"><Clock size={16} /> {day.duration}</span>
        <span className="flex items-center gap-1"><Dumbbell size={16} /> {day.exercises} ejercicios</span>
      </div>
      <button className={`mt-4 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 ${
        isToday ? 'bg-white text-primary' : 'bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white'
      }`}>
        Ver detalle <ChevronRight size={14} />
      </button>
    </div>
  );
};
