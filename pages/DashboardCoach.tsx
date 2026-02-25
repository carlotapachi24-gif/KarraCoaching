import React, { useEffect, useState } from 'react';
import { Users, AlertCircle, TrendingUp, Search, MessageSquare, FileText, CalendarDays } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ClientData {
  email: string;
  name: string;
  status: string;
  lastCheckInAt: string | null;
  lastReviewStatus: 'pending' | 'completed' | null;
  pendingReviewId: string | null;
  latestWeightKg: number | null;
}

interface CoachDashboardResponse {
  stats: {
    clientsCount: number;
    pendingReviewsCount: number;
    completedReviewsCount: number;
    adherenceAvg: number;
  };
  clients: ClientData[];
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = window.location.hostname.endsWith('github.io') ? (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '') : '';
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

export const DashboardCoach: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [stats, setStats] = useState({
    clientsCount: 0,
    pendingReviewsCount: 0,
    completedReviewsCount: 0,
    adherenceAvg: 0,
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';

  const loadData = async () => {
    try {
      const response = await fetch(apiUrl('/api/dashboard/coach'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el panel del coach');
      }

      const data = (await response.json()) as CoachDashboardResponse;
      setClients(data.clients);
      setStats(data.stats);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en panel coach');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase();
    return client.name.toLowerCase().includes(term) || client.email.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8 animate-fade-in relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Panel del Coach</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Resumen real de check-ins recibidos.</p>
        </div>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64 text-sm font-bold placeholder:text-slate-400"
          />
        </div>
      </header>

      {error && <p className="text-sm text-red-600 font-bold">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard icon={AlertCircle} label="Revisiones Pendientes" value={String(stats.pendingReviewsCount)} subValue="Requiere atencion" color="accent" />
        <MetricCard icon={Users} label="Clientes Activos" value={String(stats.clientsCount)} subValue="Con acceso" color="primary" />
        <MetricCard icon={TrendingUp} label="Adherencia Media" value={`${stats.adherenceAvg}%`} subValue={`${stats.completedReviewsCount} completadas`} color="secondary" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-display font-black italic text-xl text-text uppercase tracking-tighter">Clientes y Revisiones</h3>
          <Link to="/reviews" className="text-xs font-black text-primary hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors uppercase tracking-wider">
            Abrir Revisiones
          </Link>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Estado Revision</th>
              <th className="px-6 py-4">Ultimo Peso</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const isPending = client.lastReviewStatus === 'pending';
              return (
                <tr key={client.email} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={`https://picsum.photos/seed/${encodeURIComponent(client.email)}/100`} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-black italic uppercase text-text text-sm">{client.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isPending ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></span> Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span> Al dia
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-text">
                    {typeof client.latestWeightKg === 'number' ? `${client.latestWeightKg} kg` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => navigate('/reviews')} className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wide flex items-center gap-1">
                        <FileText size={14} /> Revisar
                      </button>
                      <button
                        onClick={() => navigate(`/messages?client=${encodeURIComponent(client.email)}`)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wide flex items-center gap-1"
                      >
                        <MessageSquare size={14} /> Mensaje
                      </button>
                      <button
                        onClick={() => navigate(`/plan?client=${encodeURIComponent(client.email)}`)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wide flex items-center gap-1"
                      >
                        <CalendarDays size={14} /> Plan
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, subValue, color }: { icon: any; label: string; value: string; subValue: string; color: 'primary' | 'secondary' | 'accent' }) => {
  const colors = {
    primary: 'bg-red-50 text-primary border-primary/10',
    secondary: 'bg-green-50 text-secondary border-secondary/10',
    accent: 'bg-orange-50 text-accent border-accent/10',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{label}</p>
        <span className="text-4xl font-black text-text font-display italic tracking-tighter">{value}</span>
        <div><span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${colors[color]}`}>{subValue}</span></div>
      </div>
    </div>
  );
};
