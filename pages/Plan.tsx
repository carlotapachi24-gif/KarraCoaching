import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';
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
  RefreshCw,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { UserRole } from '../types';
import { Library } from './Library';

interface PlanProps {
  currentUserRole: UserRole;
  currentUserEmail: string;
}

interface WorkoutExercise {
  id: string;
  resourceId: string;
  name: string;
  sets: string;
  reps: string;
  rir: string;
  weight: string;
}

interface PlanDay {
  id: string;
  day: string;
  title: string;
  duration: string;
  exercises: number;
  status: 'completed' | 'today' | 'upcoming';
  description: string;
  scheduledDate: string;
  workoutExercises: WorkoutExercise[];
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

interface MonthCell {
  dateKey: string;
  dayNumber: number;
  workouts: PlanDay[];
  isToday: boolean;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const MONTH_LABELS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const FALLBACK_EXERCISE_POOL = [
  'Sentadilla Barra Trasera',
  'Press Banca Plano',
  'Peso Muerto Rumano',
  'Remo con Barra',
  'Press Militar',
  'Dominadas',
  'Hip Thrust',
  'Prensa Inclinada',
  'Curl Femoral',
  'Plancha Frontal',
];

const toDateKey = (date: Date) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

const normalizeDateKey = (rawValue: string, fallback = '') => {
  const value = String(rawValue || '').trim();
  const dateKey = value.slice(0, 10);
  return parseDateKey(dateKey) ? dateKey : fallback;
};

const getMondayStart = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  const dayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayIndex);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (baseDate: Date, days: number) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
};
const getWeekDateKeys = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index)));

const getDayLabelFromDateKey = (dateKey: string) => {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return 'Dia';
  const mondayIndex = (parsed.getDay() + 6) % 7;
  return WEEKDAY_LABELS[mondayIndex] || 'Dia';
};

const formatShortDate = (dateKey: string) => {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return 'Fecha no definida';
  const weekday = getDayLabelFromDateKey(dateKey).slice(0, 3);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = MONTH_LABELS[parsed.getMonth()].slice(0, 3);
  return `${weekday} ${day} ${month} ${parsed.getFullYear()}`;
};

const formatWeekRange = (weekStart: Date) => {
  const from = weekStart;
  const to = addDays(weekStart, 6);
  return `${String(from.getDate()).padStart(2, '0')} ${MONTH_LABELS[from.getMonth()]} - ${String(to.getDate()).padStart(2, '0')} ${MONTH_LABELS[to.getMonth()]} ${to.getFullYear()}`;
};

const formatMonthYear = (monthCursor: Date) => `${MONTH_LABELS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;

const hashString = (value: string) => String(value || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const createDefaultExercise = (name: string, resourceId = '', index = 0): WorkoutExercise => ({
  id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
  resourceId,
  name,
  sets: index < 2 ? '4' : '3',
  reps: index < 2 ? '6-10' : '10-15',
  rir: '2',
  weight: '',
});

const buildFallbackExercises = (title: string, total: number) => {
  const count = Math.max(0, Number(total) || 0);
  if (count === 0 || title.toLowerCase().includes('descanso')) {
    return [] as WorkoutExercise[];
  }

  const offset = Math.abs(hashString(title)) % FALLBACK_EXERCISE_POOL.length;
  const length = Math.min(Math.max(count, 1), 12);
  return Array.from({ length }, (_, index) =>
    createDefaultExercise(FALLBACK_EXERCISE_POOL[(offset + index) % FALLBACK_EXERCISE_POOL.length], '', index),
  );
};

const normalizeExercise = (exercise: Partial<WorkoutExercise>, index: number): WorkoutExercise | null => {
  const name = String(exercise.name || '').trim();
  if (!name) return null;

  return {
    id: String(exercise.id || `exercise-${Date.now()}-${index}`),
    resourceId: String(exercise.resourceId || ''),
    name,
    sets: String(exercise.sets || '3').trim() || '3',
    reps: String(exercise.reps || '8-12').trim() || '8-12',
    rir: String(exercise.rir || '2').trim() || '2',
    weight: String((exercise as { weight?: string; peso?: string; load?: string }).weight || (exercise as { peso?: string }).peso || (exercise as { load?: string }).load || '').trim(),
  };
};

const normalizeDay = (rawDay: Partial<PlanDay>, index: number, fallbackDate: string): PlanDay => {
  const title = String(rawDay.title || '').trim() || `Sesion ${index + 1}`;
  const scheduledDate = normalizeDateKey(String(rawDay.scheduledDate || ''), fallbackDate);
  const fallbackDay = getDayLabelFromDateKey(scheduledDate);
  const day = String(rawDay.day || '').trim() || fallbackDay;
  const incomingExercises = Array.isArray(rawDay.workoutExercises) ? rawDay.workoutExercises : [];
  const normalizedExercises = incomingExercises
    .map((exercise, exerciseIndex) => normalizeExercise(exercise, exerciseIndex))
    .filter((exercise): exercise is WorkoutExercise => Boolean(exercise));
  const exercisesField = Math.max(0, Number(rawDay.exercises || 0));
  const workoutExercises =
    normalizedExercises.length > 0 ? normalizedExercises : buildFallbackExercises(title, exercisesField);

  return {
    id: String(rawDay.id || `day-${Date.now()}-${index}`),
    day,
    title,
    duration: String(rawDay.duration || '60 min').trim() || '60 min',
    exercises: workoutExercises.length,
    status: ['completed', 'today', 'upcoming'].includes(String(rawDay.status || ''))
      ? (String(rawDay.status) as PlanDay['status'])
      : 'upcoming',
    description: String(rawDay.description || '').trim(),
    scheduledDate,
    workoutExercises,
  };
};

const createDefaultMonthlyWeek = (index: number): MonthlyWeek => ({
  id: `week-${Date.now()}-${index}`,
  weekLabel: `Semana ${index + 1}`,
  focus: '',
  objective: '',
  status: index === 0 ? 'current' : 'upcoming',
});
const normalizeMonthlyPlan = (rawPlan: MonthlyWeek[] | undefined, monthlyGoal: string) => {
  const source = Array.isArray(rawPlan) ? rawPlan : [];
  const normalized = source
    .map((week, index) => ({
      id: String(week.id || `week-${Date.now()}-${index}`),
      weekLabel: String(week.weekLabel || `Semana ${index + 1}`).trim(),
      focus: String(week.focus || '').trim(),
      objective: String(week.objective || monthlyGoal || '').trim(),
      status: ['completed', 'current', 'upcoming'].includes(String(week.status || ''))
        ? (String(week.status) as MonthlyWeek['status'])
        : 'upcoming',
    }))
    .filter((week) => week.weekLabel && (week.focus || week.objective));

  return normalized.length > 0 ? normalized : [0, 1, 2, 3].map((index) => createDefaultMonthlyWeek(index));
};

const normalizePlanResponse = (plan: PlanResponse['plan']) => {
  const weekDates = getWeekDateKeys(getMondayStart(new Date()));
  const normalizedWeekly = (Array.isArray(plan.weeklySchedule) ? plan.weeklySchedule : [])
    .map((day, index) => normalizeDay(day, index, weekDates[index % weekDates.length]))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return {
    monthlyGoal: String(plan.monthlyGoal || '').trim() || 'Plan de trabajo',
    weeklySchedule: normalizedWeekly,
    monthlyPlan: normalizeMonthlyPlan(plan.monthlyPlan, String(plan.monthlyGoal || '').trim()),
  };
};

const getCellStatus = (workouts: PlanDay[]) => {
  if (workouts.some((workout) => workout.status === 'today')) return 'today';
  if (workouts.some((workout) => workout.status === 'completed')) return 'completed';
  if (workouts.length > 0) return 'upcoming';
  return 'empty';
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
  const [expandedEditorDayId, setExpandedEditorDayId] = useState<string | null>(null);
  const [weekCursor, setWeekCursor] = useState<Date>(() => getMondayStart(new Date()));
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isUpdatingWorkout, setIsUpdatingWorkout] = useState(false);
  const [isRefreshingClients, setIsRefreshingClients] = useState(false);
  const [error, setError] = useState('');

  const coachClientFromQuery = String(searchParams.get('client') || '').trim().toLowerCase();
  const isCoachMode = currentUserRole === UserRole.COACH;
  const targetEmail = isCoachMode ? selectedCoachClientEmail : '';
  const canLoadPlan = currentUserRole === UserRole.CLIENT || !!targetEmail;
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    if (!isCoachMode) return;
    setSelectedCoachClientEmail(coachClientFromQuery);
  }, [coachClientFromQuery, isCoachMode]);

  const loadCoachClients = useCallback(async () => {
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
  }, [coachClientFromQuery, isCoachMode]);

  const refreshCoachClients = useCallback(
    async (showSpinner = false) => {
      if (!isCoachMode) return;
      if (showSpinner) setIsRefreshingClients(true);
      try {
        await loadCoachClients();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando clientes');
      } finally {
        if (showSpinner) setIsRefreshingClients(false);
      }
    },
    [isCoachMode, loadCoachClients],
  );

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
      const normalizedPlan = normalizePlanResponse(planData.plan);

      setMonthlyGoal(normalizedPlan.monthlyGoal);
      setWeeklySchedule(normalizedPlan.weeklySchedule);
      setMonthlyPlan(normalizedPlan.monthlyPlan);
      setExpandedEditorDayId(normalizedPlan.weeklySchedule[0]?.id || null);

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
      if (isCoachMode) {
        await refreshCoachClients();
      }
    };
    bootstrap();
  }, [isCoachMode, refreshCoachClients]);

  useEffect(() => {
    if (!isCoachMode) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshCoachClients();
      }
    };

    const handleFocus = () => {
      refreshCoachClients();
    };

    const intervalId = window.setInterval(() => {
      refreshCoachClients();
    }, 15000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isCoachMode, refreshCoachClients]);

  useEffect(() => {
    loadPlan();
  }, [isCoachMode, targetEmail, currentUserRole]);

  const orderedWeeklySchedule = useMemo(
    () => [...weeklySchedule].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [weeklySchedule],
  );

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PlanDay[]>();

    orderedWeeklySchedule.forEach((workout) => {
      const dateKey = normalizeDateKey(workout.scheduledDate);
      if (!dateKey) return;
      const existing = map.get(dateKey) || [];
      existing.push(workout);
      map.set(dateKey, existing);
    });

    return map;
  }, [orderedWeeklySchedule]);

  const weekDays = useMemo(() => {
    const weekStart = getMondayStart(weekCursor);
    return getWeekDateKeys(weekStart).map((dateKey) => ({
      dateKey,
      label: getDayLabelFromDateKey(dateKey),
      workouts: workoutsByDate.get(dateKey) || [],
      isToday: dateKey === todayKey,
    }));
  }, [weekCursor, workoutsByDate, todayKey]);

  const monthCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const leadingEmptyCells = (firstDay.getDay() + 6) % 7;

    const cells: Array<MonthCell | null> = [];
    for (let i = 0; i < leadingEmptyCells; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = toDateKey(new Date(year, month, day));
      cells.push({
        dateKey,
        dayNumber: day,
        workouts: workoutsByDate.get(dateKey) || [],
        isToday: dateKey === todayKey,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [monthCursor, workoutsByDate, todayKey]);

  const selectedWorkoutExercises = useMemo(
    () => selectedWorkout?.workoutExercises || [],
    [selectedWorkout],
  );

  const selectedCoachClient = useMemo(
    () => coachClients.find((client) => client.email.toLowerCase() === selectedCoachClientEmail),
    [coachClients, selectedCoachClientEmail],
  );

  const updateDay = (dayId: string, updater: (day: PlanDay) => PlanDay) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const updated = updater(day);
        const normalizedDate = normalizeDateKey(updated.scheduledDate, day.scheduledDate || todayKey);
        const normalizedDay = updated.day?.trim() || getDayLabelFromDateKey(normalizedDate);
        const normalizedExercises = (updated.workoutExercises || [])
          .map((exercise, exerciseIndex) => normalizeExercise(exercise, exerciseIndex))
          .filter((exercise): exercise is WorkoutExercise => Boolean(exercise));

        return {
          ...updated,
          scheduledDate: normalizedDate,
          day: normalizedDay,
          workoutExercises: normalizedExercises,
          exercises: normalizedExercises.length,
        };
      }),
    );
  };

  const updateWorkout = <K extends keyof PlanDay>(dayId: string, key: K, value: PlanDay[K]) => {
    updateDay(dayId, (day) => ({ ...day, [key]: value }));
  };

  const updateWorkoutDate = (dayId: string, dateKey: string) => {
    updateDay(dayId, (day) => {
      const normalizedDate = normalizeDateKey(dateKey, day.scheduledDate || todayKey);
      return {
        ...day,
        scheduledDate: normalizedDate,
        day: getDayLabelFromDateKey(normalizedDate),
      };
    });
  };

  const isResourceSelected = (day: PlanDay, resource: LibraryResource) =>
    day.workoutExercises.some(
      (exercise) =>
        (exercise.resourceId && exercise.resourceId === resource.id) ||
        exercise.name.toLowerCase() === resource.title.toLowerCase(),
    );

  const toggleResourceForDay = (dayId: string, resource: LibraryResource) => {
    updateDay(dayId, (day) => {
      const selected = isResourceSelected(day, resource);
      if (selected) {
        return {
          ...day,
          workoutExercises: day.workoutExercises.filter(
            (exercise) =>
              exercise.resourceId !== resource.id &&
              exercise.name.toLowerCase() !== resource.title.toLowerCase(),
          ),
        };
      }

      return {
        ...day,
        workoutExercises: [
          ...day.workoutExercises,
          createDefaultExercise(resource.title, resource.id, day.workoutExercises.length),
        ],
      };
    });
  };

  const updateWorkoutExercise = (
    dayId: string,
    exerciseId: string,
    field: keyof Pick<WorkoutExercise, 'name' | 'sets' | 'reps' | 'rir' | 'weight'>,
    value: string,
  ) => {
    updateDay(dayId, (day) => ({
      ...day,
      workoutExercises: day.workoutExercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise,
      ),
    }));
  };

  const removeWorkoutExercise = (dayId: string, exerciseId: string) => {
    updateDay(dayId, (day) => ({
      ...day,
      workoutExercises: day.workoutExercises.filter((exercise) => exercise.id !== exerciseId),
    }));
  };

  const addManualExercise = (dayId: string) => {
    updateDay(dayId, (day) => ({
      ...day,
      workoutExercises: [
        ...day.workoutExercises,
        createDefaultExercise(`Ejercicio ${day.workoutExercises.length + 1}`, '', day.workoutExercises.length),
      ],
    }));
  };

  const addWorkout = () => {
    const lastDate = orderedWeeklySchedule[orderedWeeklySchedule.length - 1]?.scheduledDate;
    const baseDate = parseDateKey(lastDate || todayKey) || new Date();
    const nextDate = toDateKey(addDays(baseDate, 1));

    const newDay: PlanDay = {
      id: `day-${Date.now()}`,
      day: getDayLabelFromDateKey(nextDate),
      title: 'Nueva sesion',
      duration: '60 min',
      exercises: 0,
      status: 'upcoming',
      description: 'Describe el objetivo de esta sesion.',
      scheduledDate: nextDate,
      workoutExercises: [],
    };

    setWeeklySchedule((prev) => [...prev, newDay]);
    setExpandedEditorDayId(newDay.id);
  };

  const removeWorkout = (dayId: string) => {
    setWeeklySchedule((prev) => prev.filter((day) => day.id !== dayId));
    if (expandedEditorDayId === dayId) {
      setExpandedEditorDayId(null);
    }
  };

  const updateMonthlyWeek = <K extends keyof MonthlyWeek>(id: string, key: K, value: MonthlyWeek[K]) => {
    setMonthlyPlan((prev) => prev.map((week) => (week.id === id ? { ...week, [key]: value } : week)));
  };

  const addMonthlyWeek = () => {
    setMonthlyPlan((prev) => [...prev, createDefaultMonthlyWeek(prev.length)]);
  };

  const removeMonthlyWeek = (id: string) => {
    setMonthlyPlan((prev) => prev.filter((week) => week.id !== id));
  };

  const openExerciseDetail = (exercise: WorkoutExercise) => {
    const fromLibraryById = exercise.resourceId
      ? libraryResources.find((resource) => resource.id === exercise.resourceId)
      : null;

    const fromLibraryByName = libraryResources.find(
      (resource) => resource.title.toLowerCase() === exercise.name.toLowerCase(),
    );

    const target = fromLibraryById || fromLibraryByName;
    if (target) {
      setSelectedExerciseInfo(target);
      return;
    }

    setSelectedExerciseInfo({
      id: `fallback-${exercise.id}`,
      title: exercise.name,
      category: 'General',
      muscle: 'N/A',
      description: 'Ejercicio definido dentro del plan personalizado del coach.',
    });
  };

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
          weeklySchedule: orderedWeeklySchedule,
          monthlyPlan,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo guardar el plan' }));
        throw new Error(body.message || 'No se pudo guardar el plan');
      }

      await loadPlan();
      window.dispatchEvent(new Event('karra:data:updated'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const markWorkoutCompleted = async (exercisePayload: WorkoutExercise[]) => {
    if (!selectedWorkout) return;

    setIsUpdatingWorkout(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const workoutExercises = (Array.isArray(exercisePayload) ? exercisePayload : []).map((exercise) => ({
      id: exercise.id,
      weight: String(exercise.weight || '').trim(),
    }));

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
          workoutExercises,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo actualizar el plan' }));
        throw new Error(body.message || 'No se pudo actualizar el plan');
      }

      setSelectedWorkout(null);
      await loadPlan();
      window.dispatchEvent(new Event('karra:data:updated'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el plan');
    } finally {
      setIsUpdatingWorkout(false);
    }
  };

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
            <div className="flex items-center gap-2">
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

              <button
                onClick={() => refreshCoachClients(true)}
                disabled={isRefreshingClients}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-black uppercase tracking-wide flex items-center gap-1 disabled:opacity-60"
                title="Recargar clientes"
              >
                <RefreshCw size={14} className={isRefreshingClients ? 'animate-spin' : ''} />
                Recargar
              </button>
            </div>
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
                <Plus size={14} /> Agregar sesion
              </button>
            </div>

            {orderedWeeklySchedule.map((day) => (
              <div key={day.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                    <input
                      type="date"
                      value={day.scheduledDate}
                      onChange={(event) => updateWorkoutDate(day.id, event.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sesion</label>
                    <input
                      value={day.title}
                      onChange={(event) => updateWorkout(day.id, 'title', event.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Duracion</label>
                    <input
                      value={day.duration}
                      onChange={(event) => updateWorkout(day.id, 'duration', event.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado</label>
                    <select
                      value={day.status}
                      onChange={(event) => updateWorkout(day.id, 'status', event.target.value as PlanDay['status'])}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                    >
                      <option value="completed">completed</option>
                      <option value="today">today</option>
                      <option value="upcoming">upcoming</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col justify-end">
                    <button
                      onClick={() => removeWorkout(day.id)}
                      className="bg-white border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm font-black uppercase flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} /> Quitar
                    </button>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      {day.day} - {formatShortDate(day.scheduledDate)}
                    </p>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Total ejercicios: {day.workoutExercises.length}
                    </p>
                  </div>

                  <div className="md:col-span-6 flex items-end justify-end">
                    <button
                      onClick={() => setExpandedEditorDayId((prev) => (prev === day.id ? null : day.id))}
                      className="text-xs font-black uppercase tracking-wide text-primary"
                    >
                      {expandedEditorDayId === day.id ? 'Ocultar ejercicios' : 'Editar ejercicios'}
                    </button>
                  </div>

                  <textarea
                    value={day.description}
                    onChange={(event) => updateWorkout(day.id, 'description', event.target.value)}
                    className="md:col-span-12 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium min-h-[70px]"
                  />
                </div>

                {expandedEditorDayId === day.id && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Seleccion desde biblioteca</h4>
                      </div>

                      {libraryResources.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay recursos cargados.</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {libraryResources.map((resource) => {
                            const selected = isResourceSelected(day, resource);
                            return (
                              <label
                                key={`${day.id}-${resource.id}`}
                                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${
                                  selected ? 'bg-primary/5 border-primary/30' : 'bg-slate-50 border-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleResourceForDay(day.id, resource)}
                                  className="w-4 h-4 accent-primary"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-text truncate">{resource.title}</p>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                    {resource.category} - {resource.muscle}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Ejercicios de la sesion</h4>
                        <button
                          onClick={() => addManualExercise(day.id)}
                          className="text-xs font-black uppercase tracking-wide text-primary flex items-center gap-1"
                        >
                          <Plus size={12} /> Manual
                        </button>
                      </div>

                      {day.workoutExercises.length === 0 ? (
                        <p className="text-sm text-slate-500">Marca ejercicios a la izquierda o agrega uno manual.</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {day.workoutExercises.map((exercise, index) => (
                            <div key={exercise.id} className="border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={exercise.name}
                                  onChange={(event) =>
                                    updateWorkoutExercise(day.id, exercise.id, 'name', event.target.value)
                                  }
                                  className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-bold"
                                />
                                <button
                                  onClick={() => removeWorkoutExercise(day.id, exercise.id)}
                                  className="text-red-600 p-1 rounded hover:bg-red-50"
                                  title="Quitar ejercicio"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="space-y-1">
                                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Numero de series
                                  </span>
                                  <input
                                    value={exercise.sets}
                                    onChange={(event) =>
                                      updateWorkoutExercise(day.id, exercise.id, 'sets', event.target.value)
                                    }
                                    placeholder="Series"
                                    className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Numero de repeticiones
                                  </span>
                                  <input
                                    value={exercise.reps}
                                    onChange={(event) =>
                                      updateWorkoutExercise(day.id, exercise.id, 'reps', event.target.value)
                                    }
                                    placeholder="Reps"
                                    className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    RIR
                                  </span>
                                  <input
                                    value={exercise.rir}
                                    onChange={(event) =>
                                      updateWorkoutExercise(day.id, exercise.id, 'rir', event.target.value)
                                    }
                                    placeholder="RIR"
                                    className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold"
                                  />
                                </label>
                              </div>

                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Ejercicio {index + 1}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                <input
                  value={week.weekLabel}
                  onChange={(event) => updateMonthlyWeek(week.id, 'weekLabel', event.target.value)}
                  className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
                <input
                  value={week.focus}
                  onChange={(event) => updateMonthlyWeek(week.id, 'focus', event.target.value)}
                  className="md:col-span-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
                <input
                  value={week.objective}
                  onChange={(event) => updateMonthlyWeek(week.id, 'objective', event.target.value)}
                  className="md:col-span-5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                />
                <select
                  value={week.status}
                  onChange={(event) => updateMonthlyWeek(week.id, 'status', event.target.value as MonthlyWeek['status'])}
                  className="md:col-span-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                >
                  <option value="completed">completed</option>
                  <option value="current">current</option>
                  <option value="upcoming">upcoming</option>
                </select>
                <button
                  onClick={() => removeMonthlyWeek(week.id)}
                  className="md:col-span-1 bg-white border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm font-black uppercase flex items-center justify-center"
                >
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
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
            <button
              onClick={() => setWeekCursor((prev) => addDays(getMondayStart(prev), -7))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-500" />
            </button>

            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Semana activa</p>
              <p className="text-sm font-black text-text uppercase">{formatWeekRange(getMondayStart(weekCursor))}</p>
            </div>

            <button
              onClick={() => setWeekCursor((prev) => addDays(getMondayStart(prev), 7))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {weekDays.map((dayCell) => (
              <div key={dayCell.dateKey} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">{dayCell.label}</p>
                    <p className="text-xs font-bold text-slate-400">{formatShortDate(dayCell.dateKey)}</p>
                  </div>
                  {dayCell.isToday && (
                    <span className="text-[10px] font-black uppercase tracking-wide bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Hoy
                    </span>
                  )}
                </div>

                {dayCell.workouts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 text-center">
                    Sin sesion programada
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayCell.workouts.map((workout) => (
                      <WorkoutCard key={workout.id} day={workout} onClick={() => setSelectedWorkout(workout)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && canLoadPlan && viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {monthlyPlan.map((week) => (
              <div
                key={week.id}
                className={`rounded-xl border p-4 ${
                  week.status === 'current'
                    ? 'border-primary bg-primary/5'
                    : week.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{week.weekLabel}</p>
                <h4 className="font-black uppercase text-sm text-text mt-1">{week.focus || 'Sin foco'}</h4>
                <p className="text-xs font-medium text-slate-600 mt-2">{week.objective || 'Sin objetivo definido.'}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-500" />
              </button>

              <h2 className="font-display font-black text-2xl uppercase italic tracking-tight">
                {formatMonthYear(monthCursor)}
              </h2>

              <button
                onClick={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <p key={label} className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
                  {label.slice(0, 3)}
                </p>
              ))}

              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-slate-50/60" />;
                }

                const status = getCellStatus(cell.workouts);
                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => cell.workouts[0] && setSelectedWorkout(cell.workouts[0])}
                    className={`aspect-square rounded-xl border relative group transition-all flex flex-col items-center justify-center gap-1 ${
                      status === 'today'
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                        : status === 'completed'
                          ? 'bg-green-50 border-green-100 text-green-700 hover:border-green-300'
                          : status === 'upcoming'
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-primary/50'
                            : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-sm md:text-base font-black italic">{cell.dayNumber}</span>
                    {cell.workouts.length > 0 && (
                      <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/10">
                        {cell.workouts.length} sesion
                      </span>
                    )}
                    {cell.isToday && status !== 'today' && (
                      <span className="text-[8px] font-black uppercase tracking-wide text-primary">Hoy</span>
                    )}
                  </button>
                );
              })}
            </div>
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

const WorkoutCard = ({ day, onClick }: { day: PlanDay; onClick: () => void }) => {
  const isCompleted = day.status === 'completed';
  const isToday = day.status === 'today';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left relative p-4 rounded-2xl border transition-all group ${
        isToday
          ? 'bg-primary text-white shadow-lg shadow-primary/20'
          : isCompleted
            ? 'bg-slate-50 border-slate-200'
            : 'bg-white border-slate-100 hover:border-primary/30 hover:shadow-md'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-3 right-3 text-green-600 bg-green-100 p-1 rounded-full">
          <CheckCircle2 size={18} />
        </div>
      )}

      <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-red-100' : 'text-slate-400'}`}>
        {day.day} - {formatShortDate(day.scheduledDate)}
      </span>
      <h3 className={`font-display font-black text-lg italic uppercase tracking-tight mt-1 ${isToday ? 'text-white' : 'text-text'}`}>
        {day.title}
      </h3>
      <div className={`flex items-center gap-3 mt-2 text-xs font-bold ${isToday ? 'text-red-100' : 'text-slate-500'}`}>
        <span className="flex items-center gap-1">
          <Clock size={14} /> {day.duration}
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell size={14} /> {day.workoutExercises.length} ejercicios
        </span>
      </div>
    </button>
  );
};

const ExerciseModal = ({ resource, onClose }: { resource: LibraryResource; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
      <div className="aspect-video bg-slate-900 relative">
        <img
          src={`https://picsum.photos/seed/${encodeURIComponent(resource.id)}/800/500`}
          alt={resource.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
            <Play size={28} className="text-white ml-1" fill="currentColor" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
            {resource.category}
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
            <Dumbbell size={12} /> {resource.muscle}
          </span>
        </div>
        <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">{resource.title}</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{resource.description}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wide"
        >
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
  exercises: WorkoutExercise[];
  onClose: () => void;
  onOpenExercise: (exercise: WorkoutExercise) => void;
  onMarkCompleted: (exercisePayload: WorkoutExercise[]) => void;
  isUpdating: boolean;
}) => {
  const [exerciseInputs, setExerciseInputs] = useState<WorkoutExercise[]>(exercises);

  useEffect(() => {
    setExerciseInputs(exercises);
  }, [exercises, workout.id]);

  const updateExerciseWeight = (exerciseId: string, weight: string) => {
    setExerciseInputs((previous) =>
      previous.map((exercise) => (exercise.id === exerciseId ? { ...exercise, weight } : exercise)),
    );
  };

  return (
  <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
      <div className="bg-primary text-white p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-colors"
        >
          <X size={20} />
        </button>
        <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-3 skew-x-[-10deg]">
          {workout.day} - {formatShortDate(workout.scheduledDate)}
        </span>
        <h2 className="text-3xl font-display font-black mb-2 italic uppercase tracking-tight">{workout.title}</h2>
        <div className="flex gap-4 text-white/90 text-sm font-bold flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={16} /> {workout.duration}
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell size={16} /> {exerciseInputs.length} ejercicios
          </span>
          <span className="flex items-center gap-1">
            <Zap size={16} /> Intensidad media-alta
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h3 className="font-bold text-lg text-text mb-2 uppercase tracking-tight">Objetivo de la sesion</h3>
          <p className="text-slate-600 text-sm leading-relaxed font-medium">
            {workout.description || 'Sin descripcion especifica para esta sesion.'}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider">Ejercicios principales</h3>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex gap-3">
            <div className="bg-white text-sky-700 p-2 rounded-lg border border-sky-100 h-fit">
              <Info size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-sky-900 mb-1">Que significa RIR</p>
              <p className="text-xs text-sky-900 font-medium leading-relaxed">
                RIR significa repeticiones en reserva: cuantas repeticiones mas podrias hacer antes del fallo tecnico.
              </p>
              <p className="text-xs text-sky-900/90 font-medium leading-relaxed mt-1">
                Como calcularlo: al terminar una serie, piensa cuantas repeticiones limpias te quedaban. Si podias hacer 2 mas, tu RIR fue 2.
              </p>
            </div>
          </div>
          {exerciseInputs.length === 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 font-medium">
              No hay ejercicios configurados para esta sesion.
            </div>
          )}

          {exerciseInputs.map((exercise, index) => (
            <div
              key={exercise.id}
              onClick={() => onOpenExercise(exercise)}
              className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors group space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-white p-2 rounded-lg text-primary shadow-sm border border-slate-100 group-hover:border-primary/20">
                    <Info size={16} />
                  </div>
                  <span className="font-bold text-text group-hover:text-primary transition-colors truncate">
                    {index + 1}. {exercise.name}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-black text-right whitespace-nowrap">
                  {exercise.sets} x {exercise.reps} - RIR {exercise.rir}
                </span>
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end"
                onClick={(event) => event.stopPropagation()}
              >
                <label className="space-y-1">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Peso usado (kg) - opcional
                  </span>
                  <input
                    value={exercise.weight}
                    onChange={(event) => updateExerciseWeight(exercise.id, event.target.value)}
                    placeholder="Ej. 80 o 22.5"
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {workout.status === 'completed' ? (
          <button
            disabled
            className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 cursor-not-allowed uppercase italic tracking-wide"
          >
            <CheckCircle2 size={20} /> Entrenamiento completado
          </button>
        ) : (
          <button
            onClick={() => onMarkCompleted(exerciseInputs)}
            disabled={isUpdating}
            className="w-full bg-secondary text-white py-3 rounded-xl font-black text-lg shadow-lg shadow-secondary/20 hover:bg-secondary/90 flex items-center justify-center gap-2 transition-transform active:scale-95 uppercase italic tracking-wide disabled:opacity-70"
          >
            <Check size={20} strokeWidth={3} /> {isUpdating ? 'Guardando...' : 'Marcar como completado'}
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

