import React, { useEffect, useMemo, useState } from 'react';
import { Search, Play, Plus, Dumbbell, X, Save, Video } from 'lucide-react';

interface LibraryProps {
  isEmbedded?: boolean;
  readOnly?: boolean;
}

interface LibraryResource {
  id: string;
  title: string;
  category: string;
  muscle: string;
  description: string;
  videoUrl?: string;
  createdAt: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const BASE_URL = import.meta.env.BASE_URL || '/';
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const normalizeResourceTitle = (title: string) => String(title || '').trim().toLowerCase();

const defaultMediaByTitle: Record<string, string> = {
  'press banca plano': '/press-banca.gif',
  'dominadas pronas': '/dominadas-pronas.gif',
  'aperturas con mancuernas': '/aperturas-con-mancuernas.gif',
  'cruce de poleas': '/cruce-de-poleas.gif',
  'flexiones': '/flexiones.gif',
  'fondos en paralelas': '/fondos-paralelas.gif',
  'press banca inclinado': '/press-banca-inclinado.gif',
};

const isVideoFile = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

const resolveMediaUrl = (url: string) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const normalized = value.replace(/^\/+/, '');
  return `${BASE_URL}${normalized}`;
};

const ResourceMedia = ({ resource, className }: { resource: LibraryResource; className: string }) => {
  const [hasError, setHasError] = useState(false);
  const rawMediaUrl =
    String(resource.videoUrl || '').trim() || defaultMediaByTitle[normalizeResourceTitle(resource.title)] || '';
  const mediaUrl = resolveMediaUrl(rawMediaUrl);
  const placeholderUrl = `https://picsum.photos/seed/${encodeURIComponent(resource.id)}/800/500`;

  useEffect(() => {
    setHasError(false);
  }, [resource.id, rawMediaUrl]);

  if (!mediaUrl || hasError) {
    return <img src={placeholderUrl} alt={resource.title} className={className} />;
  }

  if (isVideoFile(rawMediaUrl)) {
    return (
      <video
        src={mediaUrl}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onError={() => setHasError(true)}
      />
    );
  }

  return <img src={mediaUrl} alt={resource.title} className={className} onError={() => setHasError(true)} />;
};

export const Library: React.FC<LibraryProps> = ({ isEmbedded = false, readOnly = false }) => {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    category: 'Pierna',
    muscle: '',
    description: '',
    videoUrl: '',
  });

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(resources.map((item) => item.category))).filter(Boolean);
    return ['Todos', ...dynamic];
  }, [resources]);

  const loadResources = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/library'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('No se pudieron cargar los recursos');
      }
      const data = (await response.json()) as { resources: LibraryResource[] };
      setResources(data.resources);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando recursos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const filteredResources = resources.filter((resource) => {
    const matchesFilter = activeFilter === 'Todos' || resource.category === activeFilter;
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      resource.title.toLowerCase().includes(search) ||
      resource.muscle.toLowerCase().includes(search) ||
      resource.description.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsSaving(true);

    try {
      const response = await fetch(apiUrl('/api/library'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResource),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo guardar el recurso' }));
        throw new Error(body.message || 'No se pudo guardar el recurso');
      }
      setIsModalOpen(false);
      setNewResource({ title: '', category: 'Pierna', muscle: '', description: '', videoUrl: '' });
      await loadResources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el recurso');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-8 animate-fade-in relative ${isEmbedded ? '' : 'pb-12'}`}>
      {selectedResource && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col">
            <div className="aspect-video bg-slate-900 relative">
              <ResourceMedia resource={selectedResource} className="w-full h-full object-cover opacity-70" />
              <button onClick={() => setSelectedResource(null)} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{selectedResource.category}</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <Dumbbell size={12} /> {selectedResource.muscle}
                </span>
              </div>
              <h2 className="text-3xl font-display font-black text-text mb-3 italic uppercase tracking-tight">{selectedResource.title}</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{selectedResource.description}</p>
              <button onClick={() => setSelectedResource(null)} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wide">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl text-text uppercase italic">Nuevo Recurso</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <Input label="Titulo" value={newResource.title} onChange={(value) => setNewResource((prev) => ({ ...prev, title: value }))} placeholder="Ej. Sentadilla Hack" required />
              <Input label="Categoria" value={newResource.category} onChange={(value) => setNewResource((prev) => ({ ...prev, category: value }))} placeholder="Ej. Pierna" required />
              <Input label="Musculo principal" value={newResource.muscle} onChange={(value) => setNewResource((prev) => ({ ...prev, muscle: value }))} placeholder="Ej. Cuadriceps" required />
              <Input label="Descripcion" value={newResource.description} onChange={(value) => setNewResource((prev) => ({ ...prev, description: value }))} placeholder="Indicaciones tecnicas..." required />
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Video URL (opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newResource.videoUrl}
                    onChange={(event) => setNewResource((prev) => ({ ...prev, videoUrl: event.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                    placeholder="https://..."
                  />
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-wide">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-70">
                  <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isEmbedded && (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Biblioteca de Recursos</h1>
            <p className="text-slate-500 mt-1 font-medium">{resources.length} recursos disponibles.</p>
          </div>
          {!readOnly && (
            <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95 uppercase tracking-wide">
              <Plus size={20} /> Nuevo Recurso
            </button>
          )}
        </header>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar recurso..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors uppercase tracking-wide ${
                activeFilter === category ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
      {isLoading && <p className="text-sm text-slate-400 font-bold">Cargando recursos...</p>}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.length > 0 ? (
            filteredResources.map((resource) => (
              <button
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                className="text-left bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-1"
              >
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  <ResourceMedia resource={resource} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/50">
                      <Play fill="currentColor" size={20} />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{resource.category}</span>
                  <h3 className="font-bold text-text text-lg leading-tight mt-3 uppercase">{resource.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase mt-3">
                    <Dumbbell size={14} /> <span>{resource.muscle}</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500">No se encontraron recursos para la busqueda actual.</div>
          )}
        </div>
      )}
    </div>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{label}</label>
    <input
      type="text"
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
      placeholder={placeholder}
    />
  </div>
);
