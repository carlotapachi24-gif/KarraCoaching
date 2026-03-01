import React, { useEffect, useRef, useState } from 'react';
import { User, Bell, Lock, Save, Mail, Camera, LogOut, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { ClientProfileData } from '../types';
import { apiUrl } from '../utils/api';

type Tab = 'profile' | 'notifications' | 'security';

interface SettingsProps {
  userName?: string;
  userEmail?: string;
  initialProfile?: ClientProfileData;
  onSaveProfile?: (profile: ClientProfileData) => Promise<void> | void;
  onLogout?: () => Promise<void> | void;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';

export const Settings: React.FC<SettingsProps> = ({
  userName = 'Cliente',
  userEmail = 'cliente@example.com',
  initialProfile,
  onSaveProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [firstName = userName, ...lastNameParts] = userName.split(' ').filter(Boolean);
  const lastName = lastNameParts.join(' ');

  const fallbackProfile: ClientProfileData = {
    firstName,
    lastName,
    email: userEmail,
    phone: '+34 600 000 000',
    birthDate: '1995-05-20',
    heightCm: 182,
    startWeightKg: 90.2,
    currentWeightKg: 83.5,
    bio: 'Quiero mejorar mi fuerza en basicos y bajar un 5% de grasa corporal para el verano.',
    injuries: [
      'Tendinopatia rotuliana leve (Rodilla derecha) - En rehabilitacion.',
      'Molestia hombro izquierdo en press vertical pesado.',
    ],
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(userEmail)}/150`,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection initialProfile={initialProfile || fallbackProfile} onSaveProfile={onSaveProfile} />;
      case 'notifications':
        return <NotificationsSection />;
      case 'security':
        return <SecuritySection onLogout={onLogout} />;
      default:
        return <ProfileSection initialProfile={initialProfile || fallbackProfile} onSaveProfile={onSaveProfile} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <header>
        <h1 className="font-display text-3xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Ajustes</h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Gestiona tu cuenta y preferencias.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3 space-y-2">
          <SettingsNav icon={User} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <SettingsNav icon={Bell} label="Notificaciones" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <SettingsNav icon={Lock} label="Seguridad" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </div>

        <div className="md:col-span-9">
          <div className="animate-fade-in">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

const SettingsNav = ({ icon: Icon, label, active = false, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase text-sm tracking-wide transition-all ${
      active ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100 italic' : 'text-slate-500 hover:bg-white/50 hover:text-text'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

const ProfileSection = ({
  initialProfile,
  onSaveProfile,
}: {
  initialProfile: ClientProfileData;
  onSaveProfile?: (profile: ClientProfileData) => Promise<void> | void;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ClientProfileData>(initialProfile);
  const [injuriesText, setInjuriesText] = useState((initialProfile.injuries || []).join('\n'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileForm(initialProfile);
    setInjuriesText((initialProfile.injuries || []).join('\n'));
  }, [initialProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveProfile?.(profileForm);
      alert('Cambios guardados correctamente');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setProfileForm((prev) => ({ ...prev, avatarUrl: url }));
    }
  };

  const calculateAge = (birthDate: string) => {
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const hasNotHadBirthday =
      today.getMonth() < date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
    if (hasNotHadBirthday) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  };

  const age = calculateAge(profileForm.birthDate);

  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black italic uppercase text-xl text-text tracking-tighter">Informacion Personal</h2>
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
            <img src={profileForm.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-50" />
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider">
            Cambiar Foto
          </button>
        </div>

        <div className="flex-1 w-full space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup
              label="Nombre"
              value={profileForm.firstName}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, firstName: value }))}
            />
            <InputGroup
              label="Apellidos"
              value={profileForm.lastName}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, lastName: value }))}
            />
          </div>
          <InputGroup label="Email" type="email" value={profileForm.email} readOnly icon={Mail} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputGroup
              label="Telefono"
              type="tel"
              value={profileForm.phone}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
            />
            <InputGroup
              label="Fecha de Nacimiento"
              type="date"
              value={profileForm.birthDate}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, birthDate: value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <InputGroup
              label="Edad"
              value={age !== null ? `${age} anos` : '-'}
              readOnly
            />
            <InputGroup
              label="Altura (cm)"
              type="number"
              step="1"
              value={String(profileForm.heightCm)}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, heightCm: Number(value) || 0 }))}
            />
            <InputGroup
              label="Peso Inicio (kg)"
              type="number"
              step="0.1"
              value={String(profileForm.startWeightKg)}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, startWeightKg: Number(value) || 0 }))}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Bio / Objetivos</label>
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-text min-h-[100px]"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Lesiones / Patologias (una por linea)</label>
            <textarea
              value={injuriesText}
              onChange={(event) => {
                const value = event.target.value;
                setInjuriesText(value);
                const parsed = value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean);
                setProfileForm((prev) => ({ ...prev, injuries: parsed }));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-text min-h-[100px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const NotificationsSection = () => {
  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
      <h2 className="font-display font-black italic uppercase text-xl text-text mb-6 tracking-tighter">Preferencias de Notificacion</h2>
      <div className="space-y-6 divide-y divide-slate-100">
        <ToggleRow title="Recordatorios de Check-in" description="Recibe un aviso los domingos por la manana." defaultChecked />
        <ToggleRow title="Mensajes del Coach" description="Notificacion push cuando recibas feedback." defaultChecked />
        <ToggleRow title="Actualizaciones del Plan" description="Avisarme cuando mi rutina sea modificada." defaultChecked />
        <ToggleRow title="Resumen Semanal" description="Email con tus estadisticas de progreso." />
        <ToggleRow title="Marketing" description="Ofertas y promociones." />
      </div>
    </section>
  );
};

const SecuritySection = ({ onLogout }: { onLogout?: () => Promise<void> | void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setIsSubmittingPassword(true);

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    try {
      const response = await fetch(apiUrl('/api/password'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'No se pudo actualizar la contrasena' }));
        throw new Error(body.message || 'No se pudo actualizar la contrasena');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Contrasena actualizada correctamente');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo actualizar la contrasena');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h2 className="font-display font-black italic uppercase text-xl text-text mb-6 flex items-center gap-2 tracking-tighter">
          <Shield size={20} className="text-primary" /> Contrasena y Seguridad
        </h2>
        <form className="space-y-4 max-w-md" onSubmit={handleChangePassword}>
          <InputGroup label="Contrasena Actual" type="password" value={currentPassword} placeholder="********" onChange={setCurrentPassword} />
          <InputGroup label="Nueva Contrasena" type="password" value={newPassword} placeholder="********" onChange={setNewPassword} />
          <InputGroup label="Confirmar Nueva Contrasena" type="password" value={confirmPassword} placeholder="********" onChange={setConfirmPassword} />
          {passwordError && <p className="text-xs text-red-600 font-bold">{passwordError}</p>}
          <div className="pt-2">
            <button disabled={isSubmittingPassword} className="px-6 py-2 bg-slate-800 text-white text-xs font-black italic rounded-xl hover:bg-slate-700 transition-colors uppercase tracking-wide disabled:opacity-70">
              {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contrasena'}
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
            onClick={() => onLogout?.()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-black italic rounded-xl hover:bg-red-50 transition-colors uppercase tracking-wide"
          >
            <LogOut size={16} /> Cerrar Sesion
          </button>
        </div>
      </section>
    </div>
  );
};

const InputGroup = ({
  label,
  type = 'text',
  value,
  placeholder,
  icon: Icon,
  onChange,
  readOnly = false,
  step,
}: {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  icon?: any;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  step?: string;
}) => (
  <div>
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        step={step}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-bold text-text"
      />
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
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
};


