import React, { useState, useRef } from 'react';
import { Calendar, Grid, List, Download, Plus, ArrowRightLeft, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const Progress: React.FC = () => {
  const [activeView, setActiveView] = useState<'frente' | 'perfil' | 'espalda'>('frente');
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Logic to show different images based on selected view (mock data)
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
      pdf.save(`progreso-lopez-coaching-${new Date().toISOString().split('T')[0]}.pdf`);
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
    <div className="space-y-8 animate-fade-in print:p-0">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-text uppercase italic tracking-tighter">Galería de Progreso</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-wide text-sm">Transformación visual de Alex Rivera</p>
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
               <button className="p-2 bg-white rounded-lg border border-slate-200 text-primary shadow-sm"><Grid size={18} /></button>
               <button className="p-2 bg-transparent text-slate-400 hover:text-slate-600"><List size={18} /></button>
            </div>
          </div>
          
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
        </div>
      </div>
    </div>
  );
};