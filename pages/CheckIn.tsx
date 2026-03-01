import React, { useEffect, useRef, useState } from 'react';
import { Upload, Camera, Scale, Zap, Moon, Save, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../utils/api';

const TOKEN_STORAGE_KEY = 'karra_auth_token';

type ProgressView = 'frente' | 'perfil' | 'espalda';

interface ProgressPhoto {
  id: string;
  view: ProgressView;
  imageData: string;
  uploadedAt: string;
  uploadedBy: string;
  weightKg: number | null;
}

interface CheckInStatusResponse {
  pendingReviews: number;
  latestReview: {
    id: string;
    status: 'pending' | 'completed';
    submittedAt: string;
    reviewedAt: string | null;
  } | null;
  latestFeedback: {
    feedback: string;
    reviewedAt: string | null;
    reviewId: string;
  } | null;
  canSubmitWeeklyCheckIn: boolean;
  nextEligibleAt: string | null;
}

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

const extractLatestPhotosByView = (photos: ProgressPhoto[]) => {
  const latestByView: Record<ProgressView, ProgressPhoto | null> = {
    frente: null,
    perfil: null,
    espalda: null,
  };

  photos.forEach((photo) => {
    const safeView: ProgressView =
      photo.view === 'perfil' || photo.view === 'espalda' ? photo.view : 'frente';
    const current = latestByView[safeView];
    if (!current || new Date(photo.uploadedAt).getTime() >= new Date(current.uploadedAt).getTime()) {
      latestByView[safeView] = photo;
    }
  });

  return latestByView;
};

export const CheckIn: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [energy, setEnergy] = useState(8);
  const [sleep, setSleep] = useState(8);
  const [stress, setStress] = useState(5);
  const [adherence, setAdherence] = useState(8);
  const [comments, setComments] = useState('');
  const [latestFeedback, setLatestFeedback] = useState('');
  const [pendingReviews, setPendingReviews] = useState(0);
  const [canSubmitThisWeek, setCanSubmitThisWeek] = useState(true);
  const [nextEligibleAt, setNextEligibleAt] = useState<string | null>(null);
  const [latestReviewStatus, setLatestReviewStatus] = useState<'pending' | 'completed' | null>(null);
  const [latestReviewDate, setLatestReviewDate] = useState<string | null>(null);
  const [latestPhotosByView, setLatestPhotosByView] = useState<Record<ProgressView, ProgressPhoto | null>>({
    frente: null,
    perfil: null,
    espalda: null,
  });
  const [isUploadingView, setIsUploadingView] = useState<ProgressView | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const loadReviewStatus = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const response = await fetch(apiUrl('/api/checkins/status'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as CheckInStatusResponse;
    setPendingReviews(data.pendingReviews || 0);
    setLatestFeedback(data.latestFeedback?.feedback || '');
    setCanSubmitThisWeek(data.canSubmitWeeklyCheckIn);
    setNextEligibleAt(data.nextEligibleAt);
    setLatestReviewStatus(data.latestReview?.status || null);
    setLatestReviewDate(data.latestReview?.submittedAt || null);
  };

  const loadProgressPhotos = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token) return;

    setIsLoadingPhotos(true);
    setPhotoError('');
    try {
      const response = await fetch(apiUrl('/api/progress/photos'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudieron cargar las fotos' }));
        throw new Error(body.message || 'No se pudieron cargar las fotos');
      }

      const data = (await response.json()) as { photos: ProgressPhoto[] };
      const photos = Array.isArray(data.photos) ? data.photos : [];
      setLatestPhotosByView(extractLatestPhotosByView(photos));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos');
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  useEffect(() => {
    void loadReviewStatus();
    void loadProgressPhotos();
  }, []);

  const handleUploadPhoto = async (view: ProgressView, file: File) => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    if (!token) {
      setPhotoError('Sesion expirada. Inicia sesion de nuevo.');
      return;
    }

    setIsUploadingView(view);
    setPhotoError('');
    try {
      const sourceDataUrl = await readFileAsDataUrl(file);
      const compressedDataUrl = await compressImageDataUrl(sourceDataUrl);
      const parsedWeight = Number(weightKg);
      const payloadWeight =
        Number.isFinite(parsedWeight) && parsedWeight > 0 ? Math.round(parsedWeight * 10) / 10 : null;

      const response = await fetch(apiUrl('/api/progress/photos'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          view,
          imageData: compressedDataUrl,
          weightKg: payloadWeight,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo subir la foto' }));
        throw new Error(body.message || 'No se pudo subir la foto');
      }

      const data = (await response.json()) as { photos: ProgressPhoto[] };
      const photos = Array.isArray(data.photos) ? data.photos : [];
      setLatestPhotosByView(extractLatestPhotosByView(photos));
      window.dispatchEvent(new Event('karra:data:updated'));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudo subir la foto');
    } finally {
      setIsUploadingView(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg) {
      alert('Introduce el peso corporal');
      return;
    }

    if (!canSubmitThisWeek) {
      alert('Ya has enviado tu check-in esta semana. Espera al proximo ciclo semanal.');
      return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl('/api/checkins'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weightKg: Number(weightKg),
          energy,
          sleep,
          stress,
          adherence,
          comments,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Error al enviar check-in' }));
        if (response.status === 409 && body.nextEligibleAt) {
          setCanSubmitThisWeek(false);
          setNextEligibleAt(body.nextEligibleAt);
        }
        throw new Error(body.message || 'Error al enviar check-in');
      }

      alert('Check-in enviado correctamente. Tu coach ya puede revisarlo.');
      setComments('');
      window.dispatchEvent(new Event('karra:data:updated'));
      await loadReviewStatus();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al enviar check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <header className="text-center">
        <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Check-in Semanal</h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Datos para revision del coach.</p>
      </header>

      {(latestFeedback || pendingReviews > 0 || !canSubmitThisWeek || latestReviewStatus) && (
        <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          {latestReviewStatus && latestReviewDate && (
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Ultimo check-in enviado: {new Date(latestReviewDate).toLocaleString()} ({latestReviewStatus === 'pending' ? 'Pendiente' : 'Completado'})
            </p>
          )}
          {pendingReviews > 0 && (
            <p className="text-xs font-black uppercase tracking-wider text-primary mb-2">
              Tienes {pendingReviews} revision(es) pendiente(s) de validar por el coach.
            </p>
          )}
          {!canSubmitThisWeek && (
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2">
              Ya registraste tu check-in semanal. Proximo envio disponible:{' '}
              {nextEligibleAt ? new Date(nextEligibleAt).toLocaleString() : 'la semana que viene'}.
            </p>
          )}
          {latestFeedback && (
            <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-primary">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Ultimo feedback del coach</p>
              <p className="text-sm text-slate-700 font-medium italic">"{latestFeedback}"</p>
            </div>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><Scale size={20} /></div>
            Metricas Fisicas
          </h2>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-8">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Info size={18} />
              <h3 className="font-black italic uppercase text-sm tracking-wider">Pesaje recomendado</h3>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed">
              En ayunas, misma bascula, misma hora aproximada y superficie estable.
            </p>
          </div>

          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Peso Corporal (kg)</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej. 83.5"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-12 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-black text-lg text-text italic"
            />
            <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent"><Zap size={20} /></div>
            Biofeedback
          </h2>
          <div className="space-y-6">
            <RangeGroup label="Nivel de Energia" value={energy} onChange={setEnergy} />
            <RangeGroup label="Calidad de Sueno" value={sleep} onChange={setSleep} icon={Moon} />
            <RangeGroup label="Estres" value={stress} onChange={setStress} />
            <RangeGroup label="Adherencia a la Dieta" value={adherence} onChange={setAdherence} />
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><Camera size={20} /></div>
            Fotos de Progreso
          </h2>

          {isLoadingPhotos && (
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Cargando fotos...</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PhotoUpload
              label="Frente"
              view="frente"
              preview={latestPhotosByView.frente}
              isUploading={isUploadingView === 'frente'}
              onUpload={handleUploadPhoto}
            />
            <PhotoUpload
              label="Perfil"
              view="perfil"
              preview={latestPhotosByView.perfil}
              isUploading={isUploadingView === 'perfil'}
              onUpload={handleUploadPhoto}
            />
            <PhotoUpload
              label="Espalda"
              view="espalda"
              preview={latestPhotosByView.espalda}
              isUploading={isUploadingView === 'espalda'}
              onUpload={handleUploadPhoto}
            />
          </div>

          {photoError && <p className="text-xs font-black uppercase tracking-wide text-red-600 mt-4">{photoError}</p>}
        </section>

        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-4 tracking-tighter">Comentarios Adicionales</h2>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium"
            placeholder="Como te has sentido esta semana..."
          />
        </section>

        <button
          type="submit"
          disabled={isSubmitting || !canSubmitThisWeek}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black italic text-xl uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait"
        >
          {isSubmitting ? 'ENVIANDO...' : canSubmitThisWeek ? 'ENVIAR CHECK-IN' : 'CHECK-IN YA ENVIADO ESTA SEMANA'}
          {!isSubmitting && <Save size={24} />}
        </button>
      </form>
    </div>
  );
};

const RangeGroup = ({ label, value, onChange, icon: Icon }: any) => (
  <div>
    <div className="flex justify-between mb-2">
      <label className="text-sm font-black uppercase italic tracking-wide text-slate-700 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-400" />} {label}
      </label>
      <span className="text-xs font-black text-white bg-primary px-2 py-0.5 rounded skew-x-[-10deg]">
        <span className="skew-x-[10deg]">{value}/10</span>
      </span>
    </div>
    <input
      type="range"
      min="1"
      max="10"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
    />
  </div>
);

interface PhotoUploadProps {
  label: string;
  view: ProgressView;
  preview: ProgressPhoto | null;
  isUploading: boolean;
  onUpload: (view: ProgressView, file: File) => Promise<void>;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ label, view, preview, isUploading, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile || isUploading) return;
    void onUpload(view, selectedFile);
  };

  return (
    <div
      className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden"
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleChange} />

      {preview?.imageData ? (
        <>
          <img src={preview.imageData} alt={label} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-xs font-black uppercase tracking-wide text-white bg-black/50 px-3 py-1 rounded-full">
              Cambiar
            </span>
          </div>
          <div className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wide text-white bg-black/50 px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} />
            Guardada
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all mb-3">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          </div>
          <span className="text-sm font-black text-slate-500 uppercase tracking-wide group-hover:text-primary">{label}</span>
        </>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
          <span className="text-xs font-black uppercase tracking-wide text-white">Subiendo...</span>
        </div>
      )}
    </div>
  );
};

