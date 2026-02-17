import React, { useState, useRef } from 'react';
import { User, Bell, Lock, Save, Mail, Camera, LogOut, Shield, AlertCircle, Loader2 } from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileSection />;
      case 'notifications': return <NotificationsSection />;
      case 'security': return <SecuritySection />;
      default: return <ProfileSection />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <header>
        <h1 className="font-display text-3xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Ajustes</h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Gestiona tu cuenta y preferencias.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Settings Navigation */}
        <div className="md:col-span-3 space-y-2">
          <SettingsNav icon={User} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <SettingsNav icon={Bell} label="Notificaciones" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <SettingsNav icon={Lock} label="Seguridad" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9">
          <div className="animate-fade-in">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsNav = ({ icon: Icon, label, active = false, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase text-sm tracking-wide transition-all ${
      active 
        ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100 italic' 
        : 'text-slate-500 hover:bg-white/50 hover:text-text'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

const ProfileSection = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [avatar, setAvatar] = useState("https://picsum.photos/seed/alex/150");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Cambios guardados correctamente");
    }, 1500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatar(url);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black italic uppercase text-xl text-text tracking-tighter">Información Personal</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white text-xs font-black italic rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-50" />
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider">Cambiar Foto</button>
        </div>

        <div className="flex-1 w-full space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup label="Nombre" defaultValue="Alex" />
            <InputGroup label="Apellidos" defaultValue="Rivera" />
          </div>
          <InputGroup label="Email" type="email" defaultValue="alex.rivera@example.com" icon={Mail} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Teléfono" type="tel" defaultValue="+34 600 000 000" />
              <InputGroup label="Fecha de Nacimiento" type="date" defaultValue="1995-05-20" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Bio / Objetivos</label>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-text min-h-[100px]" defaultValue="Quiero mejorar mi fuerza en básicos y bajar un 5% de grasa corporal para el verano." />
          </div>
        </div>
      </div>
    </section>
  );
};

const NotificationsSection = () => {
  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
      <h2 className="font-display font-black italic uppercase text-xl text-text mb-6 tracking-tighter">Preferencias de Notificación</h2>
      <div className="space-y-6 divide-y divide-slate-100">
        <ToggleRow title="Recordatorios de Check-in" description="Recibe un aviso los domingos por la mañana." defaultChecked />
        <ToggleRow title="Mensajes del Coach" description="Notificación push cuando recibas feedback." defaultChecked />
        <ToggleRow title="Actualizaciones del Plan" description="Avisarme cuando mi rutina sea modificada." defaultChecked />
        <ToggleRow title="Resumen Semanal" description="Email con tus estadísticas de progreso." />
        <ToggleRow title="Marketing" description="Ofertas y promociones." />
      </div>
    </section>
  );
};

const SecuritySection = () => {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h2 className="font-display font-black italic uppercase text-xl text-text mb-6 flex items-center gap-2 tracking-tighter">
          <Shield size={20} className="text-primary" /> Contraseña y Seguridad
        </h2>
        <form className="space-y-4 max-w-md" onSubmit={(e) => { e.preventDefault(); alert("Contraseña actualizada"); }}>
          <InputGroup label="Contraseña Actual" type="password" placeholder="••••••••" />
          <InputGroup label="Nueva Contraseña" type="password" placeholder="••••••••" />
          <InputGroup label="Confirmar Nueva Contraseña" type="password" placeholder="••••••••" />
          <div className="pt-2">
            <button className="px-6 py-2 bg-slate-800 text-white text-xs font-black italic rounded-xl hover:bg-slate-700 transition-colors uppercase tracking-wide">
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </section>
      <section className="bg-red-50/50 rounded-2xl p-6 md:p-8 border border-red-100">
          <h2 className="font-display font-black italic uppercase text-xl text-red-700 mb-2 flex items-center gap-2 tracking-tighter">
            <AlertCircle size={20} /> Zona de Peligro
          </h2>
          <p className="text-sm text-red-600/80 mb-6 font-medium">Estas acciones afectan a tu cuenta de forma inmediata.</p>
          <div className="flex gap-4">
            <button 
              onClick={() => { if(confirm("¿Estás seguro?")) window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-black italic rounded-xl hover:bg-red-50 transition-colors uppercase tracking-wide"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
      </section>
    </div>
  );
};

const InputGroup = ({ label, type = "text", defaultValue, placeholder, icon: Icon }: any) => (
  <div>
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
    <div className="relative">
      <input type={type} defaultValue={defaultValue} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-text" />
      {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
    </div>
  </div>
);

const ToggleRow = ({ title, description, defaultChecked = false }: any) => {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div className="pr-4">
        <p className="font-bold text-sm text-text uppercase tracking-wide">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{description}</p>
      </div>
      <button onClick={() => setEnabled(!enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-slate-200'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
};