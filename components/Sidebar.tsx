import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  Dumbbell, 
  Settings, 
  Menu, 
  X,
  LogOut,
  MessageSquare,
  CalendarDays,
  Activity,
  User
} from 'lucide-react';
import { UserRole } from '../types';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, setRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const logoFileName = 'ChatGPT Image 17 feb 2026, 15_33_32.png';
  const logoSrc = `${import.meta.env.BASE_URL}${encodeURI(logoFileName)}`;

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => setIsOpen(!isOpen);

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      to={to}
      onClick={() => setIsOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive(to)
          ? 'bg-primary text-white shadow-lg shadow-primary/30 skew-x-[-5deg]'
          : 'text-slate-500 hover:bg-white hover:text-primary'
      }`}
    >
      <Icon size={20} className={isActive(to) ? 'skew-x-[5deg]' : 'group-hover:scale-110 transition-transform'} />
      <span className={`font-bold uppercase tracking-tight ${isActive(to) ? 'skew-x-[5deg]' : ''}`}>{label}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
           {/* Mobile Logo Image */}
           <img 
             src={logoSrc} 
             alt="López Coaching" 
             className="h-8 w-auto object-contain"
             onError={(e) => {
               // Fallback if image fails
               e.currentTarget.style.display = 'none';
               e.currentTarget.nextElementSibling?.classList.remove('hidden');
             }}
           />
           {/* Fallback Text Logo (Hidden by default if image loads) */}
           <div className="hidden flex items-center gap-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black italic font-display transform -skew-x-12">L</div>
             <span className="font-display font-black italic text-xl uppercase tracking-tighter text-text">López <span className="text-primary">Coaching</span></span>
           </div>
        </div>
        <button onClick={toggleMenu} className="text-slate-600">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-slate-50 border-r border-slate-200 z-50 transition-transform duration-300 transform 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col`}
      >
        <div className="p-8 hidden md:flex items-center justify-center">
           {/* Desktop Logo Image */}
           <img 
             src={logoSrc} 
             alt="López Coaching" 
             className="h-14 w-auto object-contain"
             onError={(e) => {
               e.currentTarget.style.display = 'none';
               e.currentTarget.nextElementSibling?.classList.remove('hidden');
             }}
           />
           {/* Fallback Text Logo */}
           <div className="hidden flex items-center gap-3">
             <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic font-display text-2xl shadow-lg shadow-primary/20 transform -skew-x-12">L</div>
             <div className="leading-none">
               <h1 className="font-display font-black italic text-2xl uppercase tracking-tighter text-text">López</h1>
               <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block">Coaching</span>
             </div>
           </div>
        </div>

        <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          {role === UserRole.CLIENT ? (
            <>
              <div className="px-4 pb-2 mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Menú Principal</div>
              <NavItem to="/" icon={LayoutDashboard} label="Inicio" />
              <NavItem to="/profile" icon={User} label="Mi Perfil" />
              <NavItem to="/checkin" icon={ClipboardCheck} label="Check-in" />
              <NavItem to="/plan" icon={CalendarDays} label="Mi Plan" />
              <NavItem to="/activities" icon={Activity} label="Actividades" />
            </>
          ) : (
            <>
              <div className="px-4 pb-2 mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Menú Coach</div>
              <NavItem to="/" icon={LayoutDashboard} label="Panel General" />
              <NavItem to="/clients" icon={Users} label="Clientes" />
              <NavItem to="/reviews" icon={ClipboardCheck} label="Revisiones" />
              <NavItem to="/library" icon={Dumbbell} label="Biblioteca" />
            </>
          )}
          
          <div className="mt-8 px-4 pb-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">General</div>
          <NavItem to="/messages" icon={MessageSquare} label="Mensajes" />
          <NavItem to="/settings" icon={Settings} label="Ajustes" />
        </div>

        {/* User Profile / Role Switcher for Demo */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={role === UserRole.CLIENT ? "https://picsum.photos/seed/alex/100" : "https://picsum.photos/seed/coach/100"} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black italic uppercase text-text truncate">
                {role === UserRole.CLIENT ? 'Alex Rivera' : 'Yago López'}
              </p>
              <p className="text-xs text-slate-500 font-bold truncate">
                {role === UserRole.CLIENT ? 'Plan Pro' : 'Head Coach'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setRole(role === UserRole.CLIENT ? UserRole.COACH : UserRole.CLIENT)}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            {role === UserRole.CLIENT ? 'Vista Coach' : 'Vista Cliente'}
          </button>
        </div>
      </aside>
    </>
  );
};
