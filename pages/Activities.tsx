import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Dumbbell, Loader2, RefreshCw, AlertCircle, TrendingUp, Clock3 } from 'lucide-react';
import { apiUrl } from '../utils/api';

const TOKEN_STORAGE_KEY = 'karra_auth_token';

interface DashboardClientResponse {
  summary: {
    pendingReviews: number;
  };
  metrics: {
    totalCheckIns: number;
    adherenceAvg: number;
    latestWeightKg: number | null;
  };
}

interface ReviewItem {
  id: string;
  status: 'pending' | 'completed';
  submittedAt: string;
  weightKg: number;
  adherence: number;
  comments: string;
}

interface WorkoutLogItem {
  id: string;
  dayTitle: string;
  scheduledDate: string;
  completedAt: string;
  exercises: Array<{
    id: string;
    name: string;
    weight: string;
  }>;
}

interface ActivityEntry {
  id: string;
  type: 'checkin' | 'workout';
  title: string;
  subtitle: string;
  occurredAt: string;
  timestamp: number;
  status: 'pending' | 'completed';
  detail: string;
}

const parseDateSafe = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value: string) => {
  const parsed = parseDateSafe(value);
  if (!parsed) return 'Fecha no disponible';
  return parsed.toLocaleString();
};

export const Activities: React.FC = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [completedWorkouts, setCompletedWorkouts] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [adherenceAvg, setAdherenceAvg] = useState(0);
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActivities = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token) {
      setError('Sesion expirada. Inicia sesion de nuevo.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [dashboardResponse, reviewsResponse, workoutLogsResponse] = await Promise.all([
        fetch(apiUrl('/api/dashboard/client'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl('/api/reviews'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl('/api/workouts/logs'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dashboardResponse.ok || !reviewsResponse.ok || !workoutLogsResponse.ok) {
        throw new Error('No se pudo cargar la actividad real del cliente.');
      }

      const dashboard = (await dashboardResponse.json()) as DashboardClientResponse;
      const reviewsPayload = (await reviewsResponse.json()) as { reviews: ReviewItem[] };
      const workoutLogsPayload = (await workoutLogsResponse.json()) as { logs: WorkoutLogItem[] };

      const reviews = Array.isArray(reviewsPayload.reviews) ? reviewsPayload.reviews : [];
      const logs = Array.isArray(workoutLogsPayload.logs) ? workoutLogsPayload.logs : [];

      const checkInEntries: ActivityEntry[] = reviews.map((review) => {
        const parsedDate = parseDateSafe(review.submittedAt);
        return {
          id: `checkin-${review.id}`,
          type: 'checkin',
          title: review.status === 'completed' ? 'Check-in revisado' : 'Check-in enviado',
          subtitle: review.comments ? review.comments : 'Sin comentarios adicionales.',
          occurredAt: review.submittedAt,
          timestamp: parsedDate ? parsedDate.getTime() : 0,
          status: review.status,
          detail: `${review.weightKg} kg - Adherencia ${review.adherence}/10`,
        };
      });

      const workoutEntries: ActivityEntry[] = logs.map((log) => {
        const completedAt = String(log.completedAt || log.scheduledDate || '');
        const parsedDate = parseDateSafe(completedAt);
        const exercisesCount = Array.isArray(log.exercises) ? log.exercises.length : 0;
        return {
          id: `workout-${log.id}`,
          type: 'workout',
          title: log.dayTitle || 'Entrenamiento completado',
          subtitle: `Sesion registrada como completada (${exercisesCount} ejercicios).`,
          occurredAt: completedAt,
          timestamp: parsedDate ? parsedDate.getTime() : 0,
          status: 'completed',
          detail: `Fecha planificada: ${log.scheduledDate || 'No definida'}`,
        };
      });

      const mergedEntries = [...checkInEntries, ...workoutEntries].sort((a, b) => b.timestamp - a.timestamp);

      setEntries(mergedEntries);
      setTotalCheckIns(Number(dashboard.metrics?.totalCheckIns || reviews.length || 0));
      setCompletedWorkouts(logs.length);
      setPendingReviews(Number(dashboard.summary?.pendingReviews || 0));
      setAdherenceAvg(Number(dashboard.metrics?.adherenceAvg || 0));
      setLatestWeightKg(
        typeof dashboard.metrics?.latestWeightKg === 'number'
          ? dashboard.metrics.latestWeightKg
          : null,
      );
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la actividad.');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadActivities();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('karra:data:updated', refresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('karra:data:updated', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const latestEntryDate = useMemo(() => {
    if (entries.length === 0) return null;
    return entries[0].occurredAt;
  }, [entries]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tighter">Actividad Real</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-wide text-xs">
            Historial de check-ins y entrenamientos guardados en backend.
          </p>
        </div>
        <button
          onClick={() => void loadActivities()}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black uppercase tracking-wide text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Actualizar
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Check-ins" value={String(totalCheckIns)} icon={ClipboardCheck} />
        <SummaryCard label="Entrenos completados" value={String(completedWorkouts)} icon={Dumbbell} />
        <SummaryCard label="Revisiones pendientes" value={String(pendingReviews)} icon={Clock3} />
        <SummaryCard
          label="Adherencia media"
          value={`${adherenceAvg}%${typeof latestWeightKg === 'number' ? ` - ${latestWeightKg} kg` : ''}`}
          icon={TrendingUp}
        />
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-display font-black italic uppercase tracking-tight text-xl">Timeline</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {latestEntryDate ? `Ultimo evento: ${formatDateTime(latestEntryDate)}` : 'Sin eventos'}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wide text-sm">
            Cargando actividad...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wide text-sm">
            Todavia no hay actividad registrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <article key={entry.id} className="px-5 py-4 flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    entry.type === 'checkin' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  {entry.type === 'checkin' ? <ClipboardCheck size={18} /> : <Dumbbell size={18} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-sm uppercase tracking-wide text-text">{entry.title}</h3>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        entry.status === 'pending'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {entry.status === 'pending' ? 'Pendiente' : 'Completado'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium mt-1">{entry.subtitle}</p>
                  <p className="text-xs text-slate-500 font-bold mt-2">{entry.detail}</p>
                </div>

                <time className="text-xs text-slate-400 font-black uppercase tracking-wide">
                  {formatDateTime(entry.occurredAt)}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <Icon size={16} className="text-slate-400" />
    </div>
    <p className="font-display font-black italic text-2xl tracking-tight text-text">{value}</p>
  </div>
);

