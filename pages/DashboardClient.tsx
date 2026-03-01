import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../utils/api';
import {
  TrendingDown,
  CheckCircle,
  Circle,
  Play,
  ChevronRight,
  Activity,
  Dumbbell,
  ArrowLeft,
  LayoutDashboard,
  LineChart,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientProfileData } from '../types';

interface DashboardClientProps {
  currentClientName?: string;
  currentClientFullName?: string;
  currentClientEmail?: string;
  currentClientAvatarUrl?: string;
  currentClientBio?: string;
  currentClientBirthDate?: string;
  currentClientHeightCm?: number;
  currentClientStartWeightKg?: number;
  currentClientCurrentWeightKg?: number;
  currentClientInjuries?: string[];
}

interface ClientDashboardResponse {
  summary: {
    pendingReviews: number;
    latestFeedback: {
      feedback: string;
      reviewedAt: string | null;
      reviewId: string;
    } | null;
  };
  metrics: {
    latestWeightKg: number | null;
  };
}

interface ReviewItem {
  id: string;
  status: 'pending' | 'completed';
  submittedAt: string;
  weightKg: number;
  feedback: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';


const Profile = lazy(() => import('./Profile').then((module) => ({ default: module.Profile })));

export const DashboardClient: React.FC<DashboardClientProps> = ({
  currentClientName = 'Cliente',
  currentClientFullName = 'Cliente',
  currentClientEmail = 'cliente@example.com',
  currentClientAvatarUrl,
  currentClientBio,
  currentClientBirthDate,
  currentClientHeightCm,
  currentClientStartWeightKg,
  currentClientCurrentWeightKg,
  currentClientInjuries,
}) => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const isCoachView = !!clientId;
  const coachClientEmail = clientId ? decodeURIComponent(clientId) : '';

  const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');
  const [latestFeedback, setLatestFeedback] = useState('');
  const [pendingReviews, setPendingReviews] = useState(0);
  const [liveWeightKg, setLiveWeightKg] = useState<number | null>(currentClientCurrentWeightKg || null);
  const [coachViewProfile, setCoachViewProfile] = useState<ClientProfileData | null>(null);
  const [isCoachProfileLoading, setIsCoachProfileLoading] = useState(false);
  const [coachProfileError, setCoachProfileError] = useState('');

  const loadCoachProfile = useCallback(async () => {
    if (!isCoachView) return;

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token || !coachClientEmail) {
      setCoachViewProfile(null);
      setCoachProfileError('No se pudo cargar el perfil del cliente.');
      setIsCoachProfileLoading(false);
      return;
    }

    setIsCoachProfileLoading(true);
    setCoachProfileError('');

    try {
      const [profileResponse, reviewsResponse] = await Promise.all([
        fetch(apiUrl(`/api/profile?email=${encodeURIComponent(coachClientEmail)}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl(`/api/reviews?email=${encodeURIComponent(coachClientEmail)}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!profileResponse.ok) {
        const body = await profileResponse.json().catch(() => ({ message: 'No se pudo cargar el perfil del cliente.' }));
        throw new Error(body.message || 'No se pudo cargar el perfil del cliente.');
      }

      const profileData = (await profileResponse.json()) as { profile: ClientProfileData };
      const reviewsData = reviewsResponse.ok
        ? ((await reviewsResponse.json()) as { reviews: ReviewItem[] })
        : { reviews: [] };

      const reviews = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];
      const latestReview = reviews[0] || null;
      const latestFeedbackReview = reviews.find((review) => review.status === 'completed' && String(review.feedback || '').trim());
      const resolvedCurrentWeight =
        latestReview && Number.isFinite(Number(latestReview.weightKg))
          ? Number(latestReview.weightKg)
          : profileData.profile.currentWeightKg;

      setPendingReviews(reviews.filter((review) => review.status === 'pending').length);
      setLatestFeedback(latestFeedbackReview?.feedback || '');

      const normalizedProfile: ClientProfileData = {
        ...profileData.profile,
        currentWeightKg:
          Number.isFinite(Number(resolvedCurrentWeight)) && Number(resolvedCurrentWeight) > 0
            ? Number(resolvedCurrentWeight)
            : profileData.profile.currentWeightKg,
      };

      setCoachViewProfile(normalizedProfile);
      if (typeof normalizedProfile.currentWeightKg === 'number') {
        setLiveWeightKg(normalizedProfile.currentWeightKg);
      }
    } catch (error) {
      setCoachViewProfile(null);
      setCoachProfileError(error instanceof Error ? error.message : 'No se pudo cargar el perfil del cliente.');
    } finally {
      setIsCoachProfileLoading(false);
    }
  }, [coachClientEmail, isCoachView]);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token) return;

    if (isCoachView) {
      void loadCoachProfile();
      return;
    }

    const loadClientDashboard = async () => {
      try {
        const response = await fetch(apiUrl('/api/dashboard/client'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const data = (await response.json()) as ClientDashboardResponse;
        setPendingReviews(data.summary.pendingReviews || 0);
        setLatestFeedback(data.summary.latestFeedback?.feedback || '');
        if (typeof data.metrics.latestWeightKg === 'number') {
          setLiveWeightKg(data.metrics.latestWeightKg);
        }
      } catch {
        // ignore
      }
    };

    const refresh = () => {
      void loadClientDashboard();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('karra:data:updated', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('karra:data:updated', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isCoachView, loadCoachProfile]);

  useEffect(() => {
    if (!isCoachView) return;

    const refresh = () => {
      void loadCoachProfile();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('karra:data:updated', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('karra:data:updated', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isCoachView, loadCoachProfile]);

  const coachDisplayName = coachViewProfile
    ? `${coachViewProfile.firstName || ''} ${coachViewProfile.lastName || ''}`.trim()
    : displayNameFromEmail(coachClientEmail);

  const clientName = isCoachView ? coachDisplayName || 'Cliente' : currentClientName;

  const [tasks, setTasks] = useState([
    { id: 1, title: 'Registrar Entrenamiento', subtitle: 'Prioridad Alta', status: 'pending', isPriority: true },
    { id: 2, title: 'Objetivo de Proteina', subtitle: '120g / 180g consumidos', status: 'pending', isPriority: false },
    { id: 3, title: 'Subir Check-in Semanal', subtitle: 'Foto de progreso requerida', status: 'pending', isPriority: true },
    { id: 4, title: 'Beber 3L de Agua', subtitle: 'Completado', status: 'completed', isPriority: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map((t) =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t,
    ));
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const compliancePercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const clampedCompliancePercentage = Math.max(0, Math.min(100, compliancePercentage));
  const ringRadius = 62;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (clampedCompliancePercentage / 100) * ringCircumference;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {isCoachView && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-lg"><Activity size={20} /></div>
            <div>
              <p className="font-black italic uppercase text-primary text-sm">Vista de Coach</p>
              <p className="text-xs text-slate-500 font-medium">Viendo el panel de {clientName}.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-bold text-slate-500 hover:text-primary flex items-center gap-1 uppercase"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      )}

      {isCoachView && coachProfileError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm font-bold">
          <AlertCircle size={16} />
          <span>{coachProfileError}</span>
        </div>
      )}

      <header>
        <h1 className="font-display text-4xl md:text-6xl font-black text-text uppercase tracking-tighter italic leading-[0.9]">
          {isCoachView ? `PANEL DE ${clientName}` : `HOLA, ${clientName}!`}{' '}
          <span className="text-primary block md:inline">{isCoachView ? '' : 'A POR LA SEMANA.'}</span>
        </h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Lunes, 23 Oct - Dia 14 de tu programa</p>
      </header>

      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-black uppercase tracking-wide flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-text'}`}
        >
          <LayoutDashboard size={18} /> Resumen Diario
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-4 text-sm font-black uppercase tracking-wide flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-text'}`}
        >
          <LineChart size={18} /> Progreso y Metricas
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-black italic uppercase text-xl tracking-tighter">Progreso Semanal</h2>
                <div className="flex gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">Semana 2</span>
                  <span className="bg-secondary/10 text-secondary text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">En racha</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center relative">
                  <div className="w-40 h-40 relative">
                    <svg
                      viewBox="0 0 160 160"
                      className="w-full h-full -rotate-90"
                      role="img"
                      aria-label={`Habitos completados: ${clampedCompliancePercentage}%`}
                    >
                      <circle
                        cx="80"
                        cy="80"
                        r={ringRadius}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="18"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r={ringRadius}
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="18"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-[stroke-dashoffset] duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-display text-4xl font-black text-text italic tracking-tighter">{clampedCompliancePercentage}%</span>
                      <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Habitos</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 text-center font-bold uppercase">
                    <strong className="text-text">{completedTasks}/{totalTasks}</strong> completados
                  </p>
                </div>

                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-wider mb-1">Peso Actual</p>
                    <div className="flex items-end gap-2">
                      <span className="font-display text-6xl font-black text-text italic tracking-tighter leading-none">
                        {typeof liveWeightKg === 'number' ? liveWeightKg.toFixed(1) : '--'}
                      </span>
                      <span className="text-xl font-black text-slate-300 mb-2 italic uppercase">kg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-secondary bg-secondary/5 p-3 rounded-xl w-fit border border-secondary/10">
                    <TrendingDown size={20} />
                    <span className="font-black italic uppercase text-sm tracking-tight">-0.6 kg vs semana pasada</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('progress')}
                    className="text-xs font-black text-primary hover:underline uppercase tracking-wide text-left"
                  >
                    Ver Historial Completo
                  </button>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate('/plan')}
              className="relative overflow-hidden bg-primary rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-primary/20 group cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest mb-3 skew-x-[-10deg]">
                    Sesion de Hoy
                  </span>
                  <h3 className="font-display text-3xl md:text-5xl font-black mb-2 italic uppercase tracking-tighter">Tren Inferior: Fuerza</h3>
                  <div className="flex items-center gap-4 text-red-100 text-sm font-bold uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Activity size={16} /> 60 mins</span>
                    <span className="flex items-center gap-1"><Dumbbell size={16} /> 5 ejercicios</span>
                  </div>
                </div>

                <button className="bg-white text-primary px-8 py-4 rounded-xl font-black text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide italic transform skew-x-[-5deg]">
                  <Play size={18} fill="currentColor" />
                  <span className="skew-x-[5deg]">Empezar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-black italic uppercase text-xl tracking-tighter">Tareas de Hoy</h2>
                <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">
                  {tasks.filter((t) => t.status === 'pending').length} Pendientes
                </span>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    title={task.title}
                    subtitle={task.subtitle}
                    status={task.status as 'pending' | 'completed'}
                    isPriority={task.isPriority}
                    onClick={() => toggleTask(task.id)}
                  />
                ))}
              </div>

              {!isCoachView && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img src="https://picsum.photos/seed/coach/100" alt="Coach" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-black italic uppercase text-text">Coach Yago</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">En linea</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic font-medium border-l-4 border-primary">
                    {latestFeedback
                      ? `"${latestFeedback}"`
                      : '"Aun no hay feedback de revision. Cuando el coach valide tu check-in lo veras aqui."'}
                  </div>
                  {pendingReviews > 0 && (
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary mt-2">
                      {pendingReviews} revision(es) pendiente(s) de validar
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/messages')}
                    className="w-full mt-3 py-3 rounded-xl border-2 border-primary/10 text-primary text-xs font-black hover:bg-primary hover:text-white transition-colors uppercase tracking-widest italic"
                  >
                    Responder Mensaje
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : isCoachView && isCoachProfileLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center gap-3 text-slate-500 font-bold uppercase tracking-wide text-sm">
          <Loader2 size={18} className="animate-spin" />
          Cargando perfil del cliente...
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center gap-3 text-slate-500 font-bold uppercase tracking-wide text-sm">
              <Loader2 size={18} className="animate-spin" />
              Cargando progreso...
            </div>
          }
        >
          <Profile
            isEmbedded={true}
            clientName={
              isCoachView
                ? `${coachViewProfile?.firstName || ''} ${coachViewProfile?.lastName || ''}`.trim() || clientName
                : currentClientFullName
            }
            clientEmail={isCoachView ? coachClientEmail : currentClientEmail}
            avatarUrl={isCoachView ? coachViewProfile?.avatarUrl : currentClientAvatarUrl}
            objectiveText={isCoachView ? coachViewProfile?.bio : currentClientBio}
            birthDate={isCoachView ? coachViewProfile?.birthDate : currentClientBirthDate}
            heightCm={isCoachView ? coachViewProfile?.heightCm : currentClientHeightCm}
            startWeightKg={isCoachView ? coachViewProfile?.startWeightKg : currentClientStartWeightKg}
            currentWeightKg={isCoachView ? coachViewProfile?.currentWeightKg : liveWeightKg || undefined}
            injuries={isCoachView ? coachViewProfile?.injuries : currentClientInjuries}
          />
        </Suspense>
      )}
    </div>
  );
};

interface TaskItemProps {
  title: string;
  subtitle: string;
  status: 'pending' | 'completed';
  isPriority?: boolean;
  onClick: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ title, subtitle, status, isPriority = false, onClick }) => {
  const isCompleted = status === 'completed';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border-l-4 transition-all cursor-pointer group select-none
      ${isCompleted
        ? 'bg-slate-50 border-l-slate-200 border-y-slate-100 border-r-slate-100 opacity-60'
        : isPriority
          ? 'bg-white border-l-primary border-y-slate-100 border-r-slate-100 shadow-sm hover:shadow-md'
          : 'bg-white border-l-slate-300 border-y-slate-100 border-r-slate-100 hover:border-l-primary'
      }`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0
        ${isCompleted
          ? 'bg-secondary text-white'
          : isPriority
            ? 'border-2 border-primary text-primary'
            : 'border-2 border-slate-300 text-slate-300 group-hover:border-primary group-hover:text-primary'
        }`}
      >
        {isCompleted ? <CheckCircle size={14} /> : <Circle size={14} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black italic uppercase truncate tracking-tight ${isCompleted ? 'text-slate-500 line-through' : 'text-text'}`}>
          {title}
        </p>
        <p className={`text-xs font-bold uppercase tracking-wide truncate ${isPriority ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-slate-400'}`}>
          {subtitle}
        </p>
      </div>

      {!isCompleted && <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />}
    </div>
  );
};

