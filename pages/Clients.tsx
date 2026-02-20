import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, MoreVertical, Plus, Mail, User, FileText, X, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CoachClient {
  email: string;
  name: string;
  status: string;
  lastCheckInAt: string | null;
  lastReviewStatus: 'pending' | 'completed' | null;
  pendingReviewId: string | null;
  latestWeightKg: number | null;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuEmail, setOpenMenuEmail] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendiente' | 'Al dia' | 'Sin check-in'>('Todos');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingClient, setIsSavingClient] = useState(false);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();

  const loadClients = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/clients'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('No se pudieron cargar los clientes');
      }

      const data = (await response.json()) as { clients: CoachClient[] };
      setClients(data.clients);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const computedStatus = (client: CoachClient) => {
    if (!client.lastCheckInAt) return 'Sin check-in';
    return client.lastReviewStatus === 'pending' ? 'Pendiente' : 'Al dia';
  };

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(term) || client.email.toLowerCase().includes(term);
      const status = computedStatus(client);
      const matchesStatus = statusFilter === 'Todos' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  };

  const handleClearFilters = () => {
    setStatusFilter('Todos');
    setSearchTerm('');
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    setIsSavingClient(true);

    try {
      const response = await fetch(apiUrl('/api/clients'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo crear el cliente' }));
        throw new Error(body.message || 'No se pudo crear el cliente');
      }

      setIsModalOpen(false);
      setNewClient({ name: '', email: '', password: '' });
      await loadClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    } finally {
      setIsSavingClient(false);
    }
  };

  const openClientProfile = (email: string) => navigate(`/client/${encodeURIComponent(email)}`);
  const openClientMessages = (email: string) => navigate(`/messages?client=${encodeURIComponent(email)}`);
  const openClientPlan = (email: string) => navigate(`/plan?client=${encodeURIComponent(email)}`);

  return (
    <div className="space-y-8 animate-fade-in relative" onClick={() => setOpenMenuEmail(null)}>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl text-text uppercase italic">Nuevo Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(event) => setNewClient((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                  placeholder="Ej. Ana Lopez"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={newClient.email}
                  onChange={(event) => setNewClient((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Contrasena inicial</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newClient.password}
                    onChange={(event) => setNewClient((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                    placeholder="Minimo 6 caracteres"
                  />
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-wide"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-70"
                >
                  <Plus size={18} /> {isSavingClient ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Cartera de Clientes</h1>
          <p className="text-slate-500 mt-1 font-medium">{filteredClients.length} clientes encontrados</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95 uppercase tracking-wide"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[460px]">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
            />
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-bold text-sm transition-colors uppercase tracking-wide ${
              showFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showFilters ? <X size={18} /> : <Filter size={18} />}
            {showFilters ? 'Cerrar' : 'Filtros'}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 overflow-x-auto animate-fade-in">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Al dia">Al dia</option>
              <option value="Sin check-in">Sin check-in</option>
            </select>
            <button onClick={handleClearFilters} className="text-sm font-bold text-slate-500 hover:text-primary underline">
              Limpiar
            </button>
          </div>
        )}

        {error && <p className="p-4 text-sm font-bold text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className="bg-white text-slate-500 text-xs font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Ultimo check-in</th>
                <th className="px-6 py-4">Ultimo peso</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    Cargando clientes...
                  </td>
                </tr>
              )}

              {!isLoading && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    No se encontraron clientes con los filtros actuales.
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredClients.map((client) => {
                  const status = computedStatus(client);
                  return (
                    <tr key={client.email} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openClientProfile(client.email)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://picsum.photos/seed/${encodeURIComponent(client.email)}/100`}
                            alt={client.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                          />
                          <div>
                            <span className="font-bold text-text text-base block">{client.name}</span>
                            <span className="text-xs text-slate-400 font-bold">{client.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                            status === 'Pendiente'
                              ? 'bg-red-50 text-red-700'
                              : status === 'Al dia'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-bold">{formatDate(client.lastCheckInAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                        {typeof client.latestWeightKg === 'number' ? `${client.latestWeightKg} kg` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openClientMessages(client.email);
                            }}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Enviar mensaje"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuEmail((prev) => (prev === client.email ? null : client.email));
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              openMenuEmail === client.email ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-100'
                            }`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>

                        {openMenuEmail === client.email && (
                          <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-fade-in flex flex-col py-1 text-left overflow-hidden">
                            <button
                              className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                openClientProfile(client.email);
                              }}
                            >
                              <User size={16} className="text-slate-400" /> Ver Perfil
                            </button>
                            <button
                              className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                openClientPlan(client.email);
                              }}
                            >
                              <FileText size={16} className="text-slate-400" /> Abrir Plan
                            </button>
                            <button
                              className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                openClientMessages(client.email);
                              }}
                            >
                              <Mail size={16} className="text-slate-400" /> Mensaje
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
