import React, { useState } from 'react';
import { 
  Users, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  MoreHorizontal,
  Bell,
  User,
  FileText,
  MessageSquare,
  X,
  Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const initialClients = [
  { id: 1, name: 'Alex Rivera', status: 'checkin-pending', lastWeight: '83.5 kg', streak: 14, img: 'https://picsum.photos/seed/alex/100' },
  { id: 2, name: 'María García', status: 'completed', lastWeight: '62.1 kg', streak: 45, img: 'https://picsum.photos/seed/maria/100' },
  { id: 3, name: 'Juan Pérez', status: 'overdue', lastWeight: '90.2 kg', streak: 0, img: 'https://picsum.photos/seed/juan/100' },
  { id: 4, name: 'Laura Torres', status: 'completed', lastWeight: '58.0 kg', streak: 21, img: 'https://picsum.photos/seed/laura/100' },
];

export const DashboardCoach: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const navigate = useNavigate();
  
  const filteredClients = initialClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAction = (e: React.MouseEvent, action: string, clientId: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    switch(action) {
      case 'Ver Perfil': navigate(`/client/${clientId}`); break;
      case 'Editar Plan': navigate('/plan'); break;
      case 'Enviar Mensaje': navigate('/messages'); break;
      default: console.log(`Action ${action} for client ${clientId}`);
    }
  };

  const handleMarkRead = () => {
    setHasUnread(false);
    setShowNotifications(false);
  };

  return (
    <div className="space-y-8 animate-fade-in relative" onClick={() => { setOpenMenuId(null); setShowNotifications(false); }}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Panel del Coach</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Resumen de actividad del día.</p>
        </div>
        
        <div className="flex items-center gap-4">
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
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setOpenMenuId(null); }}
              className={`relative p-2 rounded-lg border transition-colors ${showNotifications ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50'}`}
            >
              <Bell size={20} />
              {hasUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white animate-pulse"></span>}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-sm text-text uppercase tracking-wider italic">Notificaciones</h3>
                  <button onClick={() => setShowNotifications(false)} className="hover:bg-slate-200 rounded-lg p-1 transition-colors"><X size={16} className="text-slate-400" /></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <NotificationItem title="Check-in Recibido" desc="Alex Rivera ha subido sus fotos." time="Hace 10 min" isNew={hasUnread} onClick={() => navigate('/checkin')} />
                  <NotificationItem title="Pago Completado" desc="Laura Torres ha renovado su plan." time="Hace 2h" isNew={hasUnread} onClick={() => navigate('/clients')} />
                  <NotificationItem title="Alerta de Riesgo" desc="Juan Pérez lleva 7 días sin actividad." time="Ayer" type="alert" onClick={() => navigate('/messages')} />
                </div>
                {hasUnread && (
                  <div className="p-3 border-t border-slate-100 text-center bg-slate-50">
                    <button onClick={handleMarkRead} className="text-xs font-black text-primary hover:text-red-800 flex items-center justify-center gap-1 mx-auto uppercase tracking-wide italic">
                      <Check size={14} /> Marcar todas como leídas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard icon={AlertCircle} label="Revisiones Pendientes" value="12" subValue="Requiere atención" color="accent" />
        <MetricCard icon={Users} label="Clientes Activos" value="48" subValue="+4 este mes" color="primary" />
        <MetricCard icon={TrendingUp} label="Adherencia Media" value="85.4%" subValue="↑ 2.1%" color="secondary" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-display font-black italic text-xl text-text uppercase tracking-tighter">Resumen de Clientes</h3>
          <Link to="/clients" className="text-xs font-black text-primary hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors uppercase tracking-wider">
            Ver Todos
          </Link>
        </div>
        
        <div className="overflow-x-visible">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Último Peso</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/client/${client.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={client.img} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-black italic uppercase text-text text-sm group-hover:text-primary transition-colors">{client.name}</p>
                        {client.streak > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-accent font-black mt-0.5 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                            {client.streak} días racha
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={client.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-black text-text font-display italic">
                      {client.lastWeight}
                      <TrendingUp size={14} className="text-secondary" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button className={`p-2 rounded-lg transition-colors ${openMenuId === client.id ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-50'}`} onClick={(e) => toggleMenu(e, client.id)}>
                      <MoreHorizontal size={20} />
                    </button>
                    {openMenuId === client.id && (
                      <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-fade-in flex flex-col py-1 text-left overflow-hidden">
                        <button className="px-4 py-2.5 hover:bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2 w-full text-left" onClick={(e) => handleAction(e, 'Ver Perfil', client.id)}>
                          <User size={16} className="text-slate-400" /> Ver Perfil
                        </button>
                        <button className="px-4 py-2.5 hover:bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2 w-full text-left" onClick={(e) => handleAction(e, 'Editar Plan', client.id)}>
                          <FileText size={16} className="text-slate-400" /> Editar Plan
                        </button>
                        <button className="px-4 py-2.5 hover:bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2 w-full text-left" onClick={(e) => handleAction(e, 'Enviar Mensaje', client.id)}>
                          <MessageSquare size={16} className="text-slate-400" /> Contactar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const NotificationItem = ({ title, desc, time, isNew, type = 'normal', onClick }: any) => (
  <div onClick={onClick} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${isNew ? 'bg-red-50/30' : ''}`}>
    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${type === 'alert' ? 'bg-red-500' : isNew ? 'bg-primary' : 'bg-slate-300'}`}></div>
    <div>
      <p className="text-sm font-black italic uppercase text-text">{title}</p>
      <p className="text-xs text-slate-500 leading-relaxed mb-1">{desc}</p>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{time}</span>
    </div>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, subValue, color }: { icon: any, label: string, value: string, subValue: string, color: 'primary' | 'secondary' | 'accent' }) => {
  const colors = {
    primary: 'bg-red-50 text-primary border-primary/10',
    secondary: 'bg-green-50 text-secondary border-secondary/10',
    accent: 'bg-orange-50 text-accent border-accent/10',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-text font-display italic tracking-tighter">{value}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${colors[color]}`}>{subValue}</span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'checkin-pending') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></span> Check-in Recibido</span>;
  if (status === 'overdue') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2"></span> Retrasado</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span> Completado</span>;
};