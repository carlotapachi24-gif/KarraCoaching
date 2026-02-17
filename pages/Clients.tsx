import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Plus, Mail, User, FileText, MessageSquare, Trash2, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const initialClients = [
  { id: 1, name: 'Alex Rivera', plan: 'Hipertrofia Pro', status: 'Activo', nextCheckin: '29 Oct', img: 'https://picsum.photos/seed/alex/100', email: 'alex@example.com' },
  { id: 2, name: 'María García', plan: 'Pérdida de Grasa', status: 'Activo', nextCheckin: '30 Oct', img: 'https://picsum.photos/seed/maria/100', email: 'maria@example.com' },
  { id: 3, name: 'Juan Pérez', plan: 'Fuerza 5x5', status: 'Inactivo', nextCheckin: '-', img: 'https://picsum.photos/seed/juan/100', email: 'juan@example.com' },
  { id: 4, name: 'Laura Torres', plan: 'Recomposición', status: 'Activo', nextCheckin: '29 Oct', img: 'https://picsum.photos/seed/laura/100', email: 'laura@example.com' },
  { id: 5, name: 'Carlos Ruiz', plan: 'Hipertrofia Básica', status: 'Activo', nextCheckin: '01 Nov', img: 'https://picsum.photos/seed/carlos/100', email: 'carlos@example.com' },
  { id: 6, name: 'Ana López', plan: 'Mantenimiento', status: 'Pausado', nextCheckin: '-', img: 'https://picsum.photos/seed/ana/100', email: 'ana@example.com' },
];

export const Clients: React.FC = () => {
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters State
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [planFilter, setPlanFilter] = useState('Todos');
  
  // New Client Form State
  const [newClient, setNewClient] = useState({ name: '', email: '', plan: 'Hipertrofia' });

  const navigate = useNavigate();

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    const matchesPlan = planFilter === 'Todos' || c.plan.includes(planFilter);
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const toggleMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleClearFilters = () => {
    setStatusFilter('Todos');
    setPlanFilter('Todos');
    setSearchTerm('');
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = clients.length + 1;
    const clientToAdd = {
      id: newId,
      name: newClient.name,
      plan: newClient.plan,
      status: 'Activo',
      nextCheckin: 'Pendiente',
      img: `https://picsum.photos/seed/${newId}/100`,
      email: newClient.email
    };
    
    // @ts-ignore
    setClients([clientToAdd, ...clients]);
    setNewClient({ name: '', email: '', plan: 'Hipertrofia' });
    setIsModalOpen(false);
  };

  const handleAction = (e: React.MouseEvent, action: string, clientId: number, clientName?: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    
    switch(action) {
      case 'profile':
        navigate(`/client/${clientId}`);
        break;
      case 'plan':
        navigate('/plan');
        break;
      case 'message':
        navigate('/messages');
        break;
      case 'delete':
        if(confirm(`¿Estás seguro que deseas archivar a ${clientName}?`)) {
          setClients(clients.filter(c => c.name !== clientName));
        }
        break;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative" onClick={() => setOpenMenuId(null)}>
      
      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl text-text uppercase italic">Nuevo Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-text"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={newClient.name}
                  onChange={e => setNewClient({...newClient, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                  placeholder="Ej. Pablo Motos"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" 
                  required
                  value={newClient.email}
                  onChange={e => setNewClient({...newClient, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Plan Inicial</label>
                <select 
                  value={newClient.plan}
                  onChange={e => setNewClient({...newClient, plan: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                >
                  <option>Hipertrofia</option>
                  <option>Fuerza</option>
                  <option>Pérdida de Grasa</option>
                  <option>Recomposición</option>
                </select>
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
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <Plus size={18} /> Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-text uppercase italic tracking-tight">Cartera de Clientes</h1>
          <p className="text-slate-500 mt-1 font-medium">{filtered.length} clientes encontrados</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors active:scale-95 uppercase tracking-wide"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por nombre..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
             />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-bold text-sm transition-colors uppercase tracking-wide ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {showFilters ? <X size={18} /> : <Filter size={18} />} 
            {showFilters ? 'Cerrar' : 'Filtros'}
          </button>
        </div>

        {/* Filters Bar (Conditional) */}
        {showFilters && (
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 overflow-x-auto animate-fade-in">
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:border-primary cursor-pointer"
             >
               <option value="Todos">Todos los Estados</option>
               <option value="Activo">Activo</option>
               <option value="Pausado">Pausado</option>
               <option value="Inactivo">Inactivo</option>
             </select>
             <select 
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:border-primary cursor-pointer"
             >
               <option value="Todos">Todos los Planes</option>
               <option value="Hipertrofia">Hipertrofia</option>
               <option value="Fuerza">Fuerza</option>
               <option value="Pérdida">Pérdida de Grasa</option>
               <option value="Recomposición">Recomposición</option>
               <option value="Mantenimiento">Mantenimiento</option>
             </select>
             <button onClick={handleClearFilters} className="text-sm font-bold text-slate-500 hover:text-primary underline">Limpiar</button>
           </div>
        )}

        {/* List */}
        <div className="overflow-x-visible">
          <table className="w-full text-left">
            <thead className="bg-white text-slate-500 text-xs font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Plan Actual</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Próximo Check-in</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/client/${client.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={client.img} alt={client.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                        <span className="font-bold text-text text-base">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">{client.plan}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        client.status === 'Activo' ? 'bg-green-50 text-green-700' : 
                        client.status === 'Inactivo' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-bold">{client.nextCheckin}</td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleAction(e, 'message', client.id, client.name)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Enviar mensaje rápido"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={(e) => toggleMenu(e, client.id)}
                          className={`p-2 rounded-lg transition-colors ${openMenuId === client.id ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-100'}`}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      {/* Context Menu */}
                      {openMenuId === client.id && (
                        <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-fade-in flex flex-col py-1 text-left overflow-hidden">
                          <button 
                            className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                            onClick={(e) => handleAction(e, 'profile', client.id, client.name)}
                          >
                            <User size={16} className="text-slate-400" /> Ver Perfil
                          </button>
                          <button 
                            className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                            onClick={(e) => handleAction(e, 'plan', client.id, client.name)}
                          >
                            <FileText size={16} className="text-slate-400" /> Editar Plan
                          </button>
                          <button 
                            className="px-4 py-2.5 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2 w-full text-left"
                            onClick={(e) => handleAction(e, 'message', client.id, client.name)}
                          >
                            <MessageSquare size={16} className="text-slate-400" /> Mensaje
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button 
                            className="px-4 py-2.5 hover:bg-red-50 text-sm font-bold text-red-600 flex items-center gap-2 w-full text-left"
                            onClick={(e) => handleAction(e, 'delete', client.id, client.name)}
                          >
                            <Trash2 size={16} className="text-red-400" /> Archivar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    No se encontraron clientes con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};