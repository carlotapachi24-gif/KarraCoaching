import React, { useState, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { User, Ruler, Weight, Activity, Zap, TrendingUp, Trophy, Target, Stethoscope, AlertTriangle, CheckCircle2, Download, Plus, ArrowRightLeft, Grid, List, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ProfileProps {
  isEmbedded?: boolean;
  clientName?: string;
  clientEmail?: string;
}

export const Profile: React.FC<ProfileProps> = ({ isEmbedded = false, clientName = 'Cliente', clientEmail = 'cliente@example.com' }) => {
  const [selectedPrExercise, setSelectedPrExercise] = useState<'squat' | 'bench' | 'deadlift'>('squat');
  
  // Progress State
  const [activeView, setActiveView] = useState<'frente' | 'perfil' | 'espalda'>('frente');
  const [isExporting, setIsExporting] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Mock Data
  const weightHistory = [
    { date: '1 Ene', weight: 88.5 },
    { date: '1 Feb', weight: 87.2 },
    { date: '1 Mar', weight: 86.0 },
    { date: '1 Abr', weight: 85.5 },
    { date: '1 May', weight: 84.2 },
    { date: '1 Jun', weight: 83.5 },
  ];

  const prHistory = {
    squat: [
      { date: 'Ene', weight: 120 },
      { date: 'Mar', weight: 130 },
      { date: 'May', weight: 135 },
      { date: 'Jun', weight: 140 },
    ],
    bench: [
      { date: 'Ene', weight: 90 },
      { date: 'Mar', weight: 95 },
      { date: 'May', weight: 97.5 },
      { date: 'Jun', weight: 100 },
    ],
    deadlift: [
      { date: 'Ene', weight: 150 },
      { date: 'Mar', weight: 160 },
      { date: 'May', weight: 170 },
      { date: 'Jun', weight: 180 },
    ]
  };

  const vamHistory = [
    { date: 'Ene', speed: 12.5 }, // km/h
    { date: 'Feb', speed: 12.8 },
    { date: 'Mar', speed: 13.0 },
    { date: 'Abr', speed: 13.2 },
    { date: 'May', speed: 13.5 },
    { date: 'Jun', speed: 13.8 },
  ];

  const personalData = {
    name: clientName,
    age: 28,
    height: 182,
    startWeight: 90.2,
    currentWeight: 83.5,
    email: clientEmail,
    level: 'Intermedio',
    // New Fields
    objective: 'Mejorar la composición corporal reduciendo grasa y aumentar el rendimiento en carrera (10k) sin perder fuerza máxima.',
    injuries: [
      'Tendinopatía rotuliana leve (Rodilla derecha) - En rehabilitación.',
      'Molestia hombro izquierdo en press vertical pesado.'
    ]
  };

  // Progress Helper Functions
  const getImages = (view: string) => {
    const seeds = {
      frente: ['fitness_front_before', 'fitness_front_after'],
      perfil: ['fitness_side_before', 'fitness_side_after'],
      espalda: ['fitness_back_before', 'fitness_back_after']
    };
    return seeds[view as keyof typeof seeds];
  };

  const currentImages = getImages(activeView);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`progreso-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      alert("Foto añadida a la galería correctamente.");
    }
  };

  return (
    <div className={`space-y-8 animate-fade-in ${isEmbedded ? '' : 'pb-12'}`}>
      {!isEmbedded && (
        <header className="print:hidden">
          <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Mi Perfil</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-wide text-sm">Tus datos y evolución atlética.</p>
        </header>
      )}

      {/* Top: Personal Stats Card */}
      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="flex-shrink-0 text-center md:text-left">
            <div className="w-32 h-32 rounded-full p-1 border-4 border-primary/20 mb-4 mx-auto md:mx-0">
               <img src={`https://picsum.photos/seed/${clientName}/200`} alt="Profile" className="w-full h-full rounded-full object-cover" />
            </div>
            <h2 className="font-display font-black italic uppercase text-2xl text-text leading-none">{personalData.name}</h2>
            <span className="text-xs font-black text-primary uppercase tracking-widest">{personalData.level}</span>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <StatBox icon={User} label="Edad" value={`${personalData.age} años`} />
            <StatBox icon={Ruler} label="Altura" value={`${personalData.height} cm`} />
            <StatBox icon={Weight} label="Peso Inicio" value={`${personalData.startWeight} kg`} />
            <StatBox icon={Weight} label="Peso Actual" value={`${personalData.currentWeight} kg`} highlight />
          </div>
        </div>
      </section>

      {/* Objective & Injuries Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {/* Objective Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary rounded-lg text-white"><Target size={24} /></div>
              <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Objetivo Actual</h3>
            </div>
            <p className="text-lg font-medium leading-relaxed text-slate-200">
              "{personalData.objective}"
            </p>
          </div>
        </div>

        {/* Injuries Card */}
        <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${personalData.injuries.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${personalData.injuries.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <Stethoscope size={24} />
            </div>
            <h3 className={`font-display font-black italic uppercase text-xl tracking-tighter ${personalData.injuries.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {personalData.injuries.length > 0 ? 'Patologías / Lesiones' : 'Estado Físico'}
            </h3>
          </div>
          
          {personalData.injuries.length > 0 ? (
            <ul className="space-y-3">
              {personalData.injuries.map((injury, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm font-bold text-red-800">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{injury}</span>
                </li>
              ))}
            </ul>
          ) : (
             <div className="flex items-center gap-2 text-green-700 font-bold">
               <CheckCircle2 size={20} />
               <span>Sin lesiones activas. ¡A tope!</span>
             </div>
          )}
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
        
        {/* Weight Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-secondary/10 text-secondary rounded-lg"><TrendingUp size={24} /></div>
             <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Evolución Peso Corporal</h3>
           </div>
           
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={weightHistory}>
                 <defs>
                   <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#10B981', fontWeight: 800 }}
                 />
                 <Area type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </section>

        {/* PR Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 text-primary rounded-lg"><Trophy size={24} /></div>
               <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Marcas Personales (PR)</h3>
             </div>
             <select 
               className="bg-slate-50 border-none font-black uppercase text-xs rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
               value={selectedPrExercise}
               onChange={(e) => setSelectedPrExercise(e.target.value as any)}
             >
               <option value="squat">Sentadilla</option>
               <option value="bench">Press Banca</option>
               <option value="deadlift">Peso Muerto</option>
             </select>
           </div>
           
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={prHistory[selectedPrExercise]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis domain={['dataMin - 10', 'dataMax + 10']} axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#DC2626', fontWeight: 800 }}
                 />
                 <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#DC2626" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#DC2626', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                 />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </section>

        {/* VAM Evolution */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Zap size={24} /></div>
             <div>
               <h3 className="font-display font-black italic uppercase text-xl tracking-tighter">Velocidad Aeróbica Máxima (VAM)</h3>
               <p className="text-xs text-slate-400 font-bold uppercase">Evolución basada en tus tiempos de carrera</p>
             </div>
           </div>
           
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={vamHistory}>
                 <defs>
                   <linearGradient id="colorVam" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                 <YAxis dataKey="speed" unit=" km/h" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#F97316', fontWeight: 800 }}
                    formatter={(value: any) => [`${value} km/h`, 'VAM']}
                 />
                 <Area type="monotone" dataKey="speed" stroke="#F97316" strokeWidth={4} fillOpacity={1} fill="url(#colorVam)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </section>
      </div>

      {/* --- Progress Gallery Section --- */}
      <div className="pt-8 border-t border-slate-200">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-text uppercase italic tracking-tighter">Galería de Progreso</h2>
            <p className="text-slate-500 mt-1 font-bold uppercase tracking-wide text-sm">Transformación visual</p>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={handleExportPDF}
               disabled={isExporting}
               className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-black uppercase tracking-wide text-sm hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait italic"
             >
               {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
               {isExporting ? 'Generando...' : 'Exportar PDF'}
             </button>
             <button 
               onClick={handleAddPhoto}
               className="px-4 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-wide text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 italic"
             >
               <Plus size={18} /> Añadir Foto
             </button>
          </div>
        </header>

        {/* Report Content Wrapper for PDF Capture */}
        <div ref={reportRef} className="space-y-8 bg-white/50 p-2 rounded-3xl"> 
          {/* Comparison Tool */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden" data-html2canvas-ignore>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                   <ArrowRightLeft size={18} />
                 </div>
                 <h2 className="font-display font-black italic uppercase tracking-tighter text-2xl">Comparador</h2>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                {(['frente', 'perfil', 'espalda'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                      activeView === view 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-slate-500 hover:text-text'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
               {/* VS Badge */}
               <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center print:hidden">
                 <div className="bg-primary text-white text-lg font-black italic px-4 py-2 rounded-full shadow-xl border-4 border-white transform skew-x-[-10deg]">VS</div>
               </div>

               {/* Before */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Antes</span>
                   <select 
                     className="bg-slate-50 border-none text-xs font-bold uppercase rounded-lg px-2 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-primary print:hidden"
                     data-html2canvas-ignore
                   >
                     <option>12 Ene 2024 (90.2 kg)</option>
                     <option>15 Feb 2024 (88.5 kg)</option>
                   </select>
                   <span className="text-xs font-bold text-slate-700 block md:hidden">12 Ene 2024</span>
                 </div>
                 <div className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden relative group">
                   <img 
                     src={`https://picsum.photos/seed/${currentImages[0]}/400/500`} 
                     alt={`Before ${activeView}`} 
                     crossOrigin="anonymous"
                     className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 print:grayscale-0" 
                   />
                 </div>
               </div>

               {/* After */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Después</span>
                   <select 
                      className="bg-slate-50 border-none text-xs font-bold uppercase rounded-lg px-2 py-1 text-slate-700 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-primary print:hidden"
                      data-html2canvas-ignore
                   >
                     <option>23 Oct 2024 (83.5 kg)</option>
                     <option>16 Oct 2024 (84.1 kg)</option>
                   </select>
                   <span className="text-xs font-bold text-slate-700 block md:hidden">23 Oct 2024</span>
                 </div>
                 <div className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden relative border-4 border-primary print:border-slate-300">
                   <img 
                     src={`https://picsum.photos/seed/${currentImages[1]}/400/500`} 
                     alt={`After ${activeView}`} 
                     crossOrigin="anonymous"
                     className="w-full h-full object-cover" 
                   />
                   <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-black italic px-2 py-1 rounded uppercase tracking-wider print:hidden transform skew-x-[-10deg]">Actual</div>
                 </div>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-12">
               <div className="text-center">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Peso Perdido</p>
                 <p className="text-4xl font-black text-primary font-display italic tracking-tight">-6.7 kg</p>
               </div>
               <div className="text-center">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tiempo</p>
                 <p className="text-4xl font-black text-text font-display italic tracking-tight">41 Semanas</p>
               </div>
            </div>
          </div>

          {/* Grid History */}
          <div className="print:hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-black italic uppercase tracking-tighter text-2xl text-text">Historial</h2>
              <div className="flex gap-2" data-html2canvas-ignore>
                 <button 
                  onClick={() => setIsGridView(true)}
                  className={`p-2 rounded-lg border transition-colors ${isGridView ? 'bg-white border-slate-200 text-primary shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                 >
                   <Grid size={18} />
                 </button>
                 <button 
                  onClick={() => setIsGridView(false)}
                  className={`p-2 rounded-lg border transition-colors ${!isGridView ? 'bg-white border-slate-200 text-primary shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                 >
                   <List size={18} />
                 </button>
              </div>
            </div>
            
            {isGridView ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="group cursor-pointer" onClick={() => setActiveView('frente')}>
                    <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden mb-2 relative">
                      <img 
                        src={`https://picsum.photos/seed/prog${i}/300/400`} 
                        alt="Progress" 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" data-html2canvas-ignore>
                        <span className="text-white text-xs font-black border-2 border-white px-3 py-1 uppercase tracking-wide">Ver</span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-text uppercase">Oct {15 - i * 7}, 2024</p>
                    <p className="text-xs text-slate-500 font-bold">8{3 + i}.{i} kg</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setActiveView('frente')}>
                     <img src={`https://picsum.photos/seed/prog${i}/100/100`} alt="Thumb" className="w-12 h-12 rounded-lg object-cover" />
                     <div className="flex-1">
                       <p className="text-sm font-black text-text uppercase">Octubre {15 - i * 7}, 2024</p>
                       <p className="text-xs text-slate-500">Semana {40 - i}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-black text-text">8{3 + i}.{i} kg</p>
                       <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">-0.{i+1}kg</span>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon: Icon, label, value, highlight = false }: any) => (
  <div className={`p-4 rounded-2xl flex flex-col justify-center ${highlight ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border border-slate-100'}`}>
    <div className={`mb-2 ${highlight ? 'text-white/80' : 'text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{label}</span>
    <span className="font-display font-black italic text-xl uppercase tracking-tighter">{value}</span>
  </div>
);
