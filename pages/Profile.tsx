import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { User, Ruler, Weight, Activity, Zap, TrendingUp, Trophy, Target, Stethoscope, AlertTriangle, CheckCircle2, Download, Plus, ArrowRightLeft, Grid, List, Loader2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type ProgressView = 'frente' | 'perfil' | 'espalda';

interface ProgressPhoto {
  id: string;
  view: ProgressView;
  imageData: string;
  uploadedAt: string;
  uploadedBy: string;
  weightKg: number | null;
}

interface ProgressMetricsResponse {
  bodyWeightHistory: {
    recordedAt: string;
    weightKg: number;
    source: string;
    reviewId: string;
  }[];
  exerciseWeightHistory: {
    exerciseName: string;
    points: {
      recordedAt: string;
      weightKg: number;
      dayTitle: string;
      dayId: string;
    }[];
  }[];
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

const compressImageDataUrl = (dataUrl: string, maxSide = 1400, quality = 0.82) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = image.width > image.height ? maxSide / image.width : maxSide / image.height;
      const scale = ratio < 1 ? ratio : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.src = dataUrl;
  });

interface ProfileProps {
  isEmbedded?: boolean;
  clientName?: string;
  clientEmail?: string;
  avatarUrl?: string;
  objectiveText?: string;
  birthDate?: string;
  heightCm?: number;
  startWeightKg?: number;
  currentWeightKg?: number;
  injuries?: string[];
}

export const Profile: React.FC<ProfileProps> = ({
  isEmbedded = false,
  clientName = 'Cliente',
  clientEmail = 'cliente@example.com',
  avatarUrl,
  objectiveText,
  birthDate,
  heightCm,
  startWeightKg,
  currentWeightKg,
  injuries,
}) => {
  const [selectedPrExercise, setSelectedPrExercise] = useState('');

  const [activeView, setActiveView] = useState<ProgressView>('frente');
  const [isExporting, setIsExporting] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [canUploadPhotos, setCanUploadPhotos] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [metricsWeightHistory, setMetricsWeightHistory] = useState<{ date: string; weight: number }[]>([]);
  const [exerciseWeightSeries, setExerciseWeightSeries] = useState<Record<string, { date: string; weight: number }[]>>({});
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const latestBodyWeight =
    metricsWeightHistory.length > 0 ? metricsWeightHistory[metricsWeightHistory.length - 1].weight : null;

  const vamHistory = [
    { date: 'Ene', speed: 12.5 }, // km/h
    { date: 'Feb', speed: 12.8 },
    { date: 'Mar', speed: 13.0 },
    { date: 'Abr', speed: 13.2 },
    { date: 'May', speed: 13.5 },
    { date: 'Jun', speed: 13.8 },
  ];

  const calculateAge = (dateValue?: string) => {
    if (!dateValue) return 28;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 28;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const hasNotHadBirthday =
      today.getMonth() < date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
    if (hasNotHadBirthday) age -= 1;
    return age > 0 ? age : 28;
  };

  const personalData = {
    name: clientName,
    age: calculateAge(birthDate),
    height: Number.isFinite(heightCm as number) ? Number(heightCm) : null,
    startWeight: Number.isFinite(startWeightKg as number) ? Number(startWeightKg) : null,
    currentWeight:
      typeof latestBodyWeight === 'number'
        ? latestBodyWeight
        : Number.isFinite(currentWeightKg as number)
          ? Number(currentWeightKg)
          : null,
    email: clientEmail,
    level: 'Intermedio',
    objective: String(objectiveText || '').trim() || 'Sin objetivo definido.',
    injuries: Array.isArray(injuries) ? injuries.filter((item) => String(item || '').trim().length > 0) : [],
  };

  const formatChartDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const fallbackWeightHistory = useMemo(() => {
    const entries: { date: string; weight: number }[] = [];
    const start = Number(personalData.startWeight);
    const current = Number(personalData.currentWeight);

    if (Number.isFinite(start) && start > 0) {
      entries.push({ date: 'Inicio', weight: Math.round(start * 10) / 10 });
    }
    if (Number.isFinite(current) && current > 0) {
      const safeCurrent = Math.round(current * 10) / 10;
      if (entries.length === 0 || entries[entries.length - 1].weight !== safeCurrent) {
        entries.push({ date: 'Actual', weight: safeCurrent });
      }
    }

    return entries;
  }, [personalData.currentWeight, personalData.startWeight]);

  const weightHistory = metricsWeightHistory.length > 0 ? metricsWeightHistory : fallbackWeightHistory;

  const exerciseOptions = useMemo(
    () => Object.keys(exerciseWeightSeries).sort((a, b) => a.localeCompare(b, 'es')),
    [exerciseWeightSeries],
  );

  const prChartData = selectedPrExercise ? exerciseWeightSeries[selectedPrExercise] || [] : [];

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token || !clientEmail) {
      setCanUploadPhotos(false);
      return;
    }

    let cancelled = false;
    const loadSession = async () => {
      try {
        const response = await fetch(apiUrl('/api/session'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Sesion no valida');
        }

        const data = (await response.json()) as { user: { email: string; role: string } };
        const sameClient =
          String(data.user?.email || '').trim().toLowerCase() === String(clientEmail).trim().toLowerCase();
        const isClient = String(data.user?.role || '').trim().toUpperCase() === 'CLIENT';
        if (!cancelled) {
          setCanUploadPhotos(isClient && sameClient);
        }
      } catch {
        if (!cancelled) {
          setCanUploadPhotos(false);
        }
      }
    };

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [clientEmail]);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token || !clientEmail) {
      setMetricsWeightHistory([]);
      setExerciseWeightSeries({});
      setSelectedPrExercise('');
      return;
    }

    let cancelled = false;
    const loadMetrics = async () => {
      setIsLoadingMetrics(true);
      const query = `?email=${encodeURIComponent(clientEmail)}`;

      try {
        const response = await fetch(apiUrl(`/api/progress/metrics${query}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ message: 'No se pudieron cargar metricas' }));
          throw new Error(body.message || 'No se pudieron cargar metricas');
        }

        const data = (await response.json()) as ProgressMetricsResponse;
        const bodyWeightHistory = Array.isArray(data.bodyWeightHistory)
          ? data.bodyWeightHistory
              .map((entry) => {
                const weight = Number(entry.weightKg);
                const timestamp = new Date(entry.recordedAt).getTime();
                if (!Number.isFinite(weight) || weight <= 0 || Number.isNaN(timestamp)) {
                  return null;
                }
                return { timestamp, date: formatChartDate(entry.recordedAt), weight: Math.round(weight * 10) / 10 };
              })
              .filter((entry): entry is { timestamp: number; date: string; weight: number } => Boolean(entry))
              .sort((a, b) => a.timestamp - b.timestamp)
              .map(({ date, weight }) => ({ date, weight }))
          : [];

        const seriesMap: Record<string, { date: string; weight: number }[]> = {};
        if (Array.isArray(data.exerciseWeightHistory)) {
          data.exerciseWeightHistory.forEach((series) => {
            const name = String(series.exerciseName || '').trim();
            if (!name || !Array.isArray(series.points)) return;

            const points = series.points
              .map((point) => {
                const weight = Number(point.weightKg);
                const timestamp = new Date(point.recordedAt).getTime();
                if (!Number.isFinite(weight) || weight <= 0 || Number.isNaN(timestamp)) {
                  return null;
                }
                return { timestamp, date: formatChartDate(point.recordedAt), weight: Math.round(weight * 100) / 100 };
              })
              .filter((point): point is { timestamp: number; date: string; weight: number } => Boolean(point))
              .sort((a, b) => a.timestamp - b.timestamp)
              .map(({ date, weight }) => ({ date, weight }));

            if (points.length > 0) {
              seriesMap[name] = points;
            }
          });
        }

        const sortedExerciseNames = Object.keys(seriesMap).sort((a, b) => a.localeCompare(b, 'es'));
        if (!cancelled) {
          setMetricsWeightHistory(bodyWeightHistory);
          setExerciseWeightSeries(seriesMap);
          setSelectedPrExercise((previous) =>
            previous && sortedExerciseNames.includes(previous) ? previous : sortedExerciseNames[0] || '',
          );
        }
      } catch {
        if (!cancelled) {
          setMetricsWeightHistory([]);
          setExerciseWeightSeries({});
          setSelectedPrExercise('');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMetrics(false);
        }
      }
    };

    const handleDataUpdated = () => {
      void loadMetrics();
    };

    void loadMetrics();
    const refreshId = window.setInterval(() => {
      void loadMetrics();
    }, 30000);
    window.addEventListener('karra:data:updated', handleDataUpdated);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
      window.removeEventListener('karra:data:updated', handleDataUpdated);
    };
  }, [clientEmail]);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token || !clientEmail) {
      setProgressPhotos([]);
      return;
    }

    let cancelled = false;
    const loadProgressPhotos = async () => {
      setIsLoadingPhotos(true);
      setPhotoError('');
      const query = `?email=${encodeURIComponent(clientEmail)}`;

      try {
        const response = await fetch(apiUrl(`/api/progress/photos${query}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ message: 'No se pudieron cargar las fotos' }));
          throw new Error(body.message || 'No se pudieron cargar las fotos');
        }

        const data = (await response.json()) as { photos: ProgressPhoto[] };
        if (!cancelled) {
          setProgressPhotos(Array.isArray(data.photos) ? data.photos : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPhotoError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos');
          setProgressPhotos([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPhotos(false);
        }
      }
    };

    loadProgressPhotos();
    return () => {
      cancelled = true;
    };
  }, [clientEmail]);

  const photosByView = useMemo(() => {
    const grouped: Record<ProgressView, ProgressPhoto[]> = {
      frente: [],
      perfil: [],
      espalda: [],
    };

    progressPhotos.forEach((photo) => {
      const view: ProgressView = photo.view === 'perfil' || photo.view === 'espalda' ? photo.view : 'frente';
      grouped[view].push(photo);
    });

    (Object.keys(grouped) as ProgressView[]).forEach((view) => {
      grouped[view].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    });

    return grouped;
  }, [progressPhotos]);

  const activePhotos = photosByView[activeView];
  const beforePhoto = activePhotos[0] || null;
  const afterPhoto = activePhotos[activePhotos.length - 1] || null;
  const timelinePhotos = [...activePhotos].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  const elapsedWeeks =
    beforePhoto && afterPhoto
      ? Math.max(
          0,
          Math.round(
            (new Date(afterPhoto.uploadedAt).getTime() - new Date(beforePhoto.uploadedAt).getTime()) /
              (1000 * 60 * 60 * 24 * 7),
          ),
        )
      : 0;

  const formatPhotoLabel = (photo: ProgressPhoto | null) => {
    if (!photo) return 'Sin foto';
    const date = new Date(photo.uploadedAt);
    const dateLabel = Number.isNaN(date.getTime())
      ? 'Fecha desconocida'
      : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const weightLabel = typeof photo.weightKg === 'number' ? ` - ${photo.weightKg.toFixed(1)} kg` : '';
    return `${dateLabel}${weightLabel}`;
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`progreso-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddPhoto = () => {
    if (isUploadingPhoto || !canUploadPhotos) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token || !clientEmail || !canUploadPhotos) {
      setPhotoError('Sesion expirada. Inicia sesion de nuevo.');
      e.target.value = '';
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError('');
    const query = `?email=${encodeURIComponent(clientEmail)}`;

    try {
      const sourceDataUrl = await readFileAsDataUrl(selectedFile);
      const compressedDataUrl = await compressImageDataUrl(sourceDataUrl);

      const response = await fetch(apiUrl(`/api/progress/photos${query}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          view: activeView,
          imageData: compressedDataUrl,
          weightKg: personalData.currentWeight,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo subir la foto' }));
        throw new Error(body.message || 'No se pudo subir la foto');
      }

      const data = (await response.json()) as { photos: ProgressPhoto[] };
      setProgressPhotos(Array.isArray(data.photos) ? data.photos : []);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudo subir la foto');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`space-y-8 animate-fade-in ${isEmbedded ? '' : 'pb-12'}`}>
      {!isEmbedded && (
        <header className="print:hidden">
          <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Mi Perfil</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Tus datos y evolución atlética.</p>
        </header>
      )}

      {/* Top: Personal Stats Card */}
      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="flex-shrink-0 text-center md:text-left">
            <div className="w-32 h-32 rounded-full p-1 border-4 border-primary/20 mb-4 mx-auto md:mx-0">
               <img src={avatarUrl || `https://picsum.photos/seed/${clientName}/200`} alt="Profile" className="w-full h-full rounded-full object-cover" />
            </div>
            <h2 className="font-display font-black italic uppercase text-2xl text-text leading-none">{personalData.name}</h2>
            <span className="text-xs font-black text-primary uppercase tracking-widest">{personalData.level}</span>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <StatBox icon={User} label="Edad" value={`${personalData.age} años`} />
            <StatBox icon={Ruler} label="Altura" value={personalData.height !== null ? `${personalData.height} cm` : '--'} />
            <StatBox icon={Weight} label="Peso Inicio" value={personalData.startWeight !== null ? `${personalData.startWeight} kg` : '--'} />
            <StatBox icon={Weight} label="Peso Actual" value={personalData.currentWeight !== null ? `${personalData.currentWeight} kg` : '--'} highlight />
          </div>
        </div>
      </section>

      {/* Objective & Injuries Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {/* Objective Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary rounded-lg text-white"><Target size={24} /></div>
              <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Objetivo Actual</h3>
            </div>
            <p className="text-lg font-medium leading-relaxed text-slate-200">
              "{personalData.objective}"
            </p>
          </div>
        </div>

        {/* Injuries Card */}
        <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${personalData.injuries.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${personalData.injuries.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <Stethoscope size={24} />
            </div>
            <h3 className={`font-display font-black italic uppercase text-xl tracking-tighter ${personalData.injuries.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {personalData.injuries.length > 0 ? 'Patologías / Lesiones' : 'Estado Físico'}
            </h3>
          </div>
          
          {personalData.injuries.length > 0 ? (
            <ul className="space-y-3">
              {personalData.injuries.map((injury, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm font-bold text-red-800">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{injury}</span>
                </li>
              ))}
            </ul>
          ) : (
             <div className="flex items-center gap-2 text-green-700 font-bold">
               <CheckCircle2 size={20} />
               <span>Sin lesiones activas. ¡A tope!</span>
             </div>
          )}
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
        
        {/* Weight Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-secondary/10 text-secondary rounded-lg"><TrendingUp size={24} /></div>
             <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Evolución Peso Corporal</h3>
           </div>
           {isLoadingMetrics && (
             <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 -mt-3 mb-3">Actualizando metricas...</p>
           )}

           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={weightHistory}>
                 <defs>
                   <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#10B981', fontWeight: 800 }}
                 />
                 <Area type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </section>

        {/* PR Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 text-primary rounded-lg"><Trophy size={24} /></div>
               <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Progreso de Cargas</h3>
             </div>
             <select 
               className="bg-slate-50 border-none font-black uppercase text-xs rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
               value={selectedPrExercise}
               onChange={(e) => setSelectedPrExercise(e.target.value)}
               disabled={exerciseOptions.length === 0}
             >
               {exerciseOptions.length > 0 ? (
                 exerciseOptions.map((exerciseName) => (
                   <option key={exerciseName} value={exerciseName}>
                     {exerciseName}
                   </option>
                 ))
               ) : (
                 <option value="">Sin datos</option>
               )}
             </select>
           </div>
           
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={prChartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#DC2626', fontWeight: 800 }}
                 />
                 <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#DC2626" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#DC2626', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                 />
               </LineChart>
             </ResponsiveContainer>
           </div>
           {exerciseOptions.length === 0 && (
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
               Completa entrenamientos y registra pesos para ver esta grafica.
             </p>
           )}
        </section>

        {/* VAM Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Zap size={24} /></div>
             <div>
               <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Velocidad Aeróbica Máxima (VAM)</h3>
               <p className="text-xs text-slate-400 font-bold uppercase">Evolución basada en tus tiempos de carrera</p>
             </div>
           </div>
           
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={vamHistory}>
                 <defs>
                   <linearGradient id="colorVam" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis dataKey="speed" unit=" km/h" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#F97316', fontWeight: 800 }}
                    formatter={(value: any) => [`${value} km/h`, 'VAM']}
                 />
                 <Area type="monotone" dataKey="speed" stroke="#F97316" strokeWidth={4} fillOpacity={1} fill="url(#colorVam)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </section>
      </div>

      {/* --- Progress Gallery Section --- */}
      <div className="pt-8 border-t border-slate-200">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-text uppercase italic tracking-tighter">Galeria de Progreso</h2>
            <p className="text-slate-500 mt-1 font-bold uppercase tracking-wide text-sm">Transformacion visual</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-black uppercase tracking-wide text-sm hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait italic"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? 'Generando...' : 'Exportar PDF'}
            </button>
            {canUploadPhotos && (
              <button
                onClick={handleAddPhoto}
                disabled={isUploadingPhoto}
                className="px-4 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-wide text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 italic disabled:opacity-60 disabled:cursor-wait"
              >
                {isUploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isUploadingPhoto ? 'Subiendo...' : 'Anadir Foto'}
              </button>
            )}
          </div>
        </header>

        {photoError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2 print:hidden">
            <AlertCircle size={16} />
            <span>{photoError}</span>
          </div>
        )}

        {isLoadingPhotos && (
          <p className="mb-6 text-sm font-bold text-slate-500 uppercase tracking-wide print:hidden">Cargando fotos...</p>
        )}

        {/* Report Content Wrapper for PDF Capture */}
        <div ref={reportRef} className="space-y-8 bg-white/50 p-2 rounded-3xl">
          {/* Comparison Tool */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden" data-html2canvas-ignore>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <ArrowRightLeft size={18} />
                </div>
                <h2 className="font-display font-black italic uppercase tracking-tighter text-2xl">Comparador</h2>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                {(['frente', 'perfil', 'espalda'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                      activeView === view ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-text'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center print:hidden">
                <div className="bg-primary text-white text-lg font-black italic px-4 py-2 rounded-full shadow-xl border-4 border-white transform skew-x-[-10deg]">VS</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Antes</span>
                  <span className="text-xs font-bold text-slate-700">{formatPhotoLabel(beforePhoto)}</span>
                </div>
                <div className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden relative group">
                  {beforePhoto ? (
                    <img
                      src={beforePhoto.imageData}
                      alt={`Antes ${activeView}`}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 print:grayscale-0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500 px-6 text-center bg-slate-100">
                      Sin foto inicial para esta vista.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Despues</span>
                  <span className="text-xs font-bold text-slate-700">{formatPhotoLabel(afterPhoto)}</span>
                </div>
                <div className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden relative border-4 border-primary print:border-slate-300">
                  {afterPhoto ? (
                    <img
                      src={afterPhoto.imageData}
                      alt={`Despues ${activeView}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500 px-6 text-center bg-slate-100">
                      Sube tu primera foto para empezar a comparar.
                    </div>
                  )}
                  {afterPhoto && (
                    <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-black italic px-2 py-1 rounded uppercase tracking-wider print:hidden transform skew-x-[-10deg]">
                      Actual
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-12">
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Fotos Vista</p>
                <p className="text-4xl font-black text-primary font-display italic tracking-tight">{activePhotos.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tiempo</p>
                <p className="text-4xl font-black text-text font-display italic tracking-tight">
                  {beforePhoto && afterPhoto ? `${elapsedWeeks} semanas` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Grid History */}
          <div className="print:hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black italic uppercase tracking-tighter text-2xl text-text">Historial</h2>
              <div className="flex gap-2" data-html2canvas-ignore>
                <button
                  onClick={() => setIsGridView(true)}
                  className={`p-2 rounded-lg border transition-colors ${isGridView ? 'bg-white border-slate-200 text-primary shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className={`p-2 rounded-lg border transition-colors ${!isGridView ? 'bg-white border-slate-200 text-primary shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {timelinePhotos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Aun no hay fotos en esta vista.</p>
              </div>
            ) : isGridView ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {timelinePhotos.map((photo) => (
                  <div key={photo.id} className="group cursor-pointer" onClick={() => setActiveView(photo.view)}>
                    <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden mb-2 relative">
                      <img src={photo.imageData} alt="Progreso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" data-html2canvas-ignore>
                        <span className="text-white text-xs font-black border-2 border-white px-3 py-1 uppercase tracking-wide">Ver</span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-text uppercase">{formatPhotoLabel(photo)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {timelinePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setActiveView(photo.view)}
                  >
                    <img src={photo.imageData} alt="Miniatura progreso" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-black text-text uppercase">{formatPhotoLabel(photo)}</p>
                      <p className="text-xs text-slate-500 uppercase">{photo.view}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon: Icon, label, value, highlight = false }: any) => (
  <div className={`p-4 rounded-2xl flex flex-col justify-center ${highlight ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border border-slate-100'}`}>
    <div className={`mb-2 ${highlight ? 'text-white/80' : 'text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{label}</span>
    <span className="font-display font-black italic text-xl uppercase tracking-tighter">{value}</span>
  </div>
);

