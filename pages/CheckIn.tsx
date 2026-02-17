import React, { useState, useRef } from 'react';
import { Upload, Camera, Scale, Zap, Moon, Save, CheckCircle, Info } from 'lucide-react';

export const CheckIn: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert("¡Check-in enviado correctamente! Tu coach lo revisará pronto.");
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <header className="text-center">
        <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest skew-x-[-10deg] inline-block mb-3">
          <span className="skew-x-[10deg] inline-block">Domingo 22 Oct</span>
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Check-in Semanal</h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Tómate tu tiempo para rellenar los datos con precisión.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Metrics */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><Scale size={20} /></div>
            Métricas Físicas
          </h2>

          {/* Weighing Protocol Info Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-8">
            <div className="flex items-center gap-2 mb-4 text-primary">
               <Info size={18} />
               <h3 className="font-black italic uppercase text-sm tracking-wider">¿Cómo debo pesarme correctamente?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <WeighingStep num="01" text="Pésate siempre en ayunas, justo después de levantarte y de haber ido al baño." />
              <WeighingStep num="02" text="Usa la misma báscula siempre y colócala en una superficie dura y plana (evita alfombras)." />
              <WeighingStep num="03" text="Pésate con la mínima ropa posible (o sin ropa) para evitar variaciones." />
              <WeighingStep num="04" text="Intenta hacerlo siempre a la misma hora aproximada." />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Peso Corporal (kg)</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Ej. 83.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-12 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-black text-lg text-text italic"
                  />
                  <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); alert("Peso registrado temporalmente."); }}
                  className="bg-slate-800 text-white px-6 rounded-xl font-black italic uppercase tracking-wider hover:bg-slate-700 transition-colors shadow-lg shadow-slate-800/20 active:scale-95 text-xs md:text-sm flex items-center gap-2"
                >
                  <Save size={18} />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Biofeedback */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
           <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent"><Zap size={20} /></div>
            Biofeedback
          </h2>
          <div className="space-y-6">
            <RangeGroup label="Nivel de Energía" min="1" max="10" />
            <RangeGroup label="Calidad de Sueño" min="1" max="10" icon={Moon} />
            <RangeGroup label="Estrés" min="1" max="10" />
            <RangeGroup label="Adherencia a la Dieta" min="1" max="10" />
          </div>
        </section>

        {/* Section 3: Photos */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-6 flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><Camera size={20} /></div>
            Fotos de Progreso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PhotoUpload label="Frente" />
            <PhotoUpload label="Perfil" />
            <PhotoUpload label="Espalda" />
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center font-bold uppercase">
            * Asegúrate de tener buena iluminación y usar la misma ropa que la semana pasada.
          </p>
        </section>

        {/* Section 4: Comments */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-display font-black italic uppercase text-2xl mb-4 tracking-tighter">Comentarios Adicionales</h2>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium"
            placeholder="¿Alguna molestia entrenando? ¿Eventos sociales esta semana? Cuéntame cómo te has sentido."
          ></textarea>
        </section>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black italic text-xl uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait"
        >
          {isSubmitting ? 'ENVIANDO...' : 'ENVIAR CHECK-IN'}
          {!isSubmitting && <Save size={24} />}
        </button>
      </form>
    </div>
  );
};

const WeighingStep = ({ num, text }: { num: string, text: string }) => (
  <div className="flex gap-3 items-start">
    <span className="font-display font-black text-3xl text-slate-200 italic leading-none select-none">{num}</span>
    <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed pt-1">{text}</p>
  </div>
);

const InputGroup = ({ label, placeholder, icon: Icon }: any) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{label}</label>
    <div className="relative">
      <input 
        type="number" 
        step="0.1"
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-12 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-black text-lg text-text italic"
      />
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />}
    </div>
  </div>
);

const RangeGroup = ({ label, min, max, icon: Icon }: any) => (
  <div>
    <div className="flex justify-between mb-2">
      <label className="text-sm font-black uppercase italic tracking-wide text-slate-700 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-400" />} {label}
      </label>
      <span className="text-xs font-black text-white bg-primary px-2 py-0.5 rounded skew-x-[-10deg]">
        <span className="skew-x-[10deg]">8/10</span>
      </span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      defaultValue="8"
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
    />
    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
      <span>Bajo</span>
      <span>Alto</span>
    </div>
  </div>
);

const PhotoUpload = ({ label }: { label: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div 
      className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
      onClick={() => fileInputRef.current?.click()}
    >
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" />
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all mb-3">
        <Upload size={20} />
      </div>
      <span className="text-sm font-black text-slate-500 uppercase tracking-wide group-hover:text-primary">{label}</span>
    </div>
  );
};